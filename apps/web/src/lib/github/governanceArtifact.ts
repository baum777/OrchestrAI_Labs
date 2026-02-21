import { SystemClock } from "@agent-system/governance-v2/runtime/clock";
import { inflateRawSync } from "node:zlib";

export type GovernanceOverall = "PASS" | "WARN" | "FAIL";

export type GovernanceStatusError = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export type GovernanceStatusResponse = {
  meta: {
    generatedAt: string;
    branch: string;
    workflow: {
      name: string;
      file: string;
      runId?: number;
      runUrl?: string;
    };
    artifact: {
      name: string;
      id?: number;
      downloadUrl?: string;
      webUrl?: string;
    };
  };
  summary: {
    overall: GovernanceOverall;
    counts: {
      blueprintViolations: number;
      goldenTasksIssues: number;
      prNonCompliant: number;
      openPrs: number;
    };
  };
  checks: {
    blueprint: { violations: unknown[] };
    goldenTasks: { items: unknown[]; counts: { total: number; issues: number } };
    prGovernance: Record<string, unknown>;
  };
  prs: Array<{
    number: number;
    title: string;
    url: string;
    author?: string;
    base?: string;
    draft?: boolean;
    updatedAt?: string;
    compliant: boolean;
    missingSections: string[];
  }>;
  error?: GovernanceStatusError;
};

type GithubWorkflowRun = {
  id: number;
  html_url?: string;
  status?: string;
  conclusion?: string;
};

type GithubArtifact = {
  id: number;
  name: string;
  archive_download_url?: string;
};

type GithubPullRequest = {
  number: number;
  title: string;
  html_url: string;
  draft?: boolean;
  updated_at?: string;
  user?: { login?: string };
  base?: { ref?: string };
  body?: string | null;
};

const DEFAULT_WORKFLOW_FILE = "timestamp-integrity.yml";
const DEFAULT_WORKFLOW_NAME = "timestamp-integrity";
const GOVERNANCE_ARTIFACT_NAME = "governance-status";
const GOVERNANCE_STATUS_FILENAME = "governance-status.json";

const REQUIRED_PR_SECTIONS = [
  "Change Summary",
  "Risk Assessment",
  "Rollback Strategy",
  "Verification Plan",
  "Golden Task Impact",
  "Ops Evidence Updated",
] as const;

function safeBranch(input: string | null | undefined): string | undefined {
  if (!input) return undefined;
  const trimmed = input.trim();
  if (!trimmed) return undefined;
  // conservative: avoid injection into URL query
  if (!/^[A-Za-z0-9._/-]+$/.test(trimmed)) return undefined;
  return trimmed;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  if (Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function deriveOverallFromCounts(counts: {
  blueprintViolations: number;
  goldenTasksIssues: number;
  prNonCompliant: number;
}): GovernanceOverall {
  const totalIssues = counts.blueprintViolations + counts.goldenTasksIssues + counts.prNonCompliant;
  return totalIssues > 0 ? "WARN" : "PASS";
}

function buildBaseResponse(params: {
  branch: string;
  generatedAt: string;
  run?: GithubWorkflowRun;
  artifact?: GithubArtifact;
  error?: GovernanceStatusError;
}): GovernanceStatusResponse {
  const runUrl =
    params.run?.html_url ??
    (params.run?.id ? `https://github.com/${defaultRepo()}/actions/runs/${params.run.id}` : undefined);

  const webArtifactUrl =
    params.artifact?.id && params.run?.id
      ? `https://github.com/${defaultRepo()}/actions/runs/${params.run.id}/artifacts/${params.artifact.id}`
      : undefined;

  return {
    meta: {
      generatedAt: params.generatedAt,
      branch: params.branch,
      workflow: {
        name: DEFAULT_WORKFLOW_NAME,
        file: DEFAULT_WORKFLOW_FILE,
        runId: params.run?.id,
        runUrl,
      },
      artifact: {
        name: GOVERNANCE_ARTIFACT_NAME,
        id: params.artifact?.id,
        downloadUrl: params.artifact?.archive_download_url,
        webUrl: webArtifactUrl,
      },
    },
    summary: {
      overall: "WARN",
      counts: {
        blueprintViolations: 0,
        goldenTasksIssues: 0,
        prNonCompliant: 0,
        openPrs: 0,
      },
    },
    checks: {
      blueprint: { violations: [] },
      goldenTasks: { items: [], counts: { total: 0, issues: 0 } },
      prGovernance: { warnOnly: true },
    },
    prs: [],
    error: params.error,
  };
}

function normalizeArtifactJson(input: unknown): {
  checks: {
    blueprintViolations: unknown[];
    goldenTasksItems: unknown[];
    prGovernance: Record<string, unknown>;
  };
  artifactOverall?: GovernanceOverall;
  artifactGeneratedAt?: string;
} {
  const root = asRecord(input) ?? {};
  const meta = asRecord(root.meta) ?? {};
  const summary = asRecord(root.summary) ?? {};
  const checks = asRecord(root.checks) ?? {};

  const blueprint = asRecord(checks.blueprint) ?? {};
  const goldenTasks = asRecord(checks.goldenTasks) ?? {};
  const prGovernance = asRecord(checks.prGovernance) ?? {};

  const violations = asArray(blueprint.violations);
  const items = asArray(goldenTasks.items);

  const overall = asString(summary.overall) as GovernanceOverall | undefined;
  const generatedAt = asString(meta.generatedAt);

  return {
    checks: {
      blueprintViolations: violations,
      goldenTasksItems: items,
      prGovernance,
    },
    artifactOverall: overall,
    artifactGeneratedAt: generatedAt,
  };
}

function prMissingSections(body: string | null | undefined): string[] {
  const text = body ?? "";
  const missing: string[] = [];
  for (const section of REQUIRED_PR_SECTIONS) {
    const re = new RegExp(`^##\\s+${escapeRegex(section)}\\s*$`, "mi");
    if (!re.test(text)) missing.push(section);
  }
  return missing;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function defaultRepo(): string {
  return process.env.GOVERNANCE_GITHUB_REPO ?? process.env.GITHUB_REPOSITORY ?? "baum777/OrchestrAI_Labs";
}

function repoParts(repo: string): { owner: string; name: string } | undefined {
  const [owner, name] = repo.split("/");
  if (!owner || !name) return undefined;
  return { owner, name };
}

async function githubApiJson<T>(
  token: string,
  path: string,
  init?: RequestInit
): Promise<{ ok: true; data: T } | { ok: false; status: number; message: string }> {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    return { ok: false, status: res.status, message: res.statusText };
  }
  const data = (await res.json()) as T;
  return { ok: true, data };
}

async function githubApiBuffer(
  token: string,
  url: string
): Promise<{ ok: true; data: Buffer } | { ok: false; status: number; message: string }> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
    redirect: "follow",
  });
  if (!res.ok) return { ok: false, status: res.status, message: res.statusText };
  const ab = await res.arrayBuffer();
  return { ok: true, data: Buffer.from(ab) };
}

function unzipFile(zip: Buffer, fileName: string): Buffer {
  // Minimal ZIP reader:
  // - no Zip64
  // - supports STORED (0) and DEFLATE (8)
  // - uses central directory to locate local header + sizes
  const EOCD_SIG = 0x06054b50;
  const CEN_SIG = 0x02014b50;
  const LOC_SIG = 0x04034b50;

  const maxComment = 0xffff;
  const start = Math.max(0, zip.length - (22 + maxComment));
  let eocdOffset = -1;
  for (let i = zip.length - 22; i >= start; i--) {
    if (zip.readUInt32LE(i) === EOCD_SIG) {
      eocdOffset = i;
      break;
    }
  }
  if (eocdOffset === -1) {
    throw new Error("ZIP: EOCD not found");
  }

  const cdSize = zip.readUInt32LE(eocdOffset + 12);
  const cdOffset = zip.readUInt32LE(eocdOffset + 16);
  if (cdOffset + cdSize > zip.length) {
    throw new Error("ZIP: central directory out of bounds");
  }

  let ptr = cdOffset;
  while (ptr < cdOffset + cdSize) {
    if (zip.readUInt32LE(ptr) !== CEN_SIG) {
      throw new Error("ZIP: invalid central directory header");
    }
    const compression = zip.readUInt16LE(ptr + 10);
    const compressedSize = zip.readUInt32LE(ptr + 20);
    const uncompressedSize = zip.readUInt32LE(ptr + 24);
    const fileNameLen = zip.readUInt16LE(ptr + 28);
    const extraLen = zip.readUInt16LE(ptr + 30);
    const commentLen = zip.readUInt16LE(ptr + 32);
    const localHeaderOffset = zip.readUInt32LE(ptr + 42);

    const nameStart = ptr + 46;
    const nameEnd = nameStart + fileNameLen;
    const entryName = zip.toString("utf8", nameStart, nameEnd);

    if (entryName === fileName) {
      if (zip.readUInt32LE(localHeaderOffset) !== LOC_SIG) {
        throw new Error("ZIP: invalid local header signature");
      }
      const localNameLen = zip.readUInt16LE(localHeaderOffset + 26);
      const localExtraLen = zip.readUInt16LE(localHeaderOffset + 28);
      const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
      const dataEnd = dataStart + compressedSize;
      if (dataEnd > zip.length) {
        throw new Error("ZIP: file data out of bounds");
      }
      const compressed = zip.subarray(dataStart, dataEnd);
      if (compression === 0) {
        return compressed;
      }
      if (compression === 8) {
        const out = inflateRawSync(compressed);
        if (uncompressedSize && out.length !== uncompressedSize) {
          // best-effort: don't fail hard, but keep signal
        }
        return out;
      }
      throw new Error(`ZIP: unsupported compression method ${compression}`);
    }

    ptr = nameEnd + extraLen + commentLen;
  }

  throw new Error(`ZIP: file not found: ${fileName}`);
}

async function getLatestSuccessfulRun(params: {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}): Promise<{ ok: true; run?: GithubWorkflowRun } | { ok: false; error: GovernanceStatusError }> {
  const qBranch = encodeURIComponent(params.branch);
  const path = `/repos/${params.owner}/${params.repo}/actions/workflows/${DEFAULT_WORKFLOW_FILE}/runs?branch=${qBranch}&status=success&per_page=1`;
  const res = await githubApiJson<{ workflow_runs?: GithubWorkflowRun[] }>(params.token, path);
  if (!res.ok) {
    return {
      ok: false,
      error: {
        code: "github_workflow_runs_failed",
        message: `GitHub workflow runs konnten nicht geladen werden (${res.status} ${res.message}).`,
      },
    };
  }
  const run = res.data.workflow_runs?.[0];
  return { ok: true, run };
}

async function getRunArtifacts(params: {
  token: string;
  owner: string;
  repo: string;
  runId: number;
}): Promise<{ ok: true; artifacts: GithubArtifact[] } | { ok: false; error: GovernanceStatusError }> {
  const path = `/repos/${params.owner}/${params.repo}/actions/runs/${params.runId}/artifacts?per_page=100`;
  const res = await githubApiJson<{ artifacts?: GithubArtifact[] }>(params.token, path);
  if (!res.ok) {
    return {
      ok: false,
      error: {
        code: "github_artifacts_failed",
        message: `GitHub artifacts konnten nicht geladen werden (${res.status} ${res.message}).`,
      },
    };
  }
  return { ok: true, artifacts: res.data.artifacts ?? [] };
}

async function getOpenPrs(params: {
  token: string;
  owner: string;
  repo: string;
  base: string;
}): Promise<{ ok: true; prs: GithubPullRequest[] } | { ok: false; error: GovernanceStatusError }> {
  const qBase = encodeURIComponent(params.base);
  const path = `/repos/${params.owner}/${params.repo}/pulls?state=open&base=${qBase}&per_page=100`;
  const res = await githubApiJson<GithubPullRequest[]>(params.token, path);
  if (!res.ok) {
    return {
      ok: false,
      error: {
        code: "github_open_prs_failed",
        message: `Open PRs konnten nicht geladen werden (${res.status} ${res.message}).`,
      },
    };
  }
  return { ok: true, prs: res.data };
}

export async function fetchGovernanceStatus(params: {
  branch?: string;
  includePRs?: boolean;
  token?: string;
}): Promise<GovernanceStatusResponse> {
  const clock = new SystemClock();
  const generatedAt = clock.now().toISOString();

  const branch = safeBranch(params.branch) ?? "main";
  const includePRs = params.includePRs ?? true;

  const token = params.token ?? process.env.GITHUB_TOKEN;
  const repo = defaultRepo();
  const parts = repoParts(repo);
  if (!parts) {
    return buildBaseResponse({
      branch,
      generatedAt,
      error: { code: "invalid_repo", message: `Ungültiges Repo-Format: ${repo}` },
    });
  }
  if (!token) {
    return buildBaseResponse({
      branch,
      generatedAt,
      error: { code: "missing_github_token", message: "GITHUB_TOKEN ist nicht gesetzt." },
    });
  }

  const runRes = await getLatestSuccessfulRun({ token, owner: parts.owner, repo: parts.name, branch });
  if (!runRes.ok) {
    return buildBaseResponse({ branch, generatedAt, error: runRes.error });
  }
  if (!runRes.run?.id) {
    return buildBaseResponse({
      branch,
      generatedAt,
      error: { code: "no_successful_run", message: "Kein erfolgreicher Workflow-Run gefunden." },
    });
  }

  const artifactsRes = await getRunArtifacts({ token, owner: parts.owner, repo: parts.name, runId: runRes.run.id });
  if (!artifactsRes.ok) {
    return buildBaseResponse({ branch, generatedAt, run: runRes.run, error: artifactsRes.error });
  }
  const artifact = artifactsRes.artifacts.find((a) => a.name === GOVERNANCE_ARTIFACT_NAME);
  if (!artifact?.archive_download_url) {
    return buildBaseResponse({
      branch,
      generatedAt,
      run: runRes.run,
      error: { code: "artifact_missing", message: `Artifact '${GOVERNANCE_ARTIFACT_NAME}' nicht gefunden.` },
    });
  }

  const zipRes = await githubApiBuffer(token, artifact.archive_download_url);
  if (!zipRes.ok) {
    return buildBaseResponse({
      branch,
      generatedAt,
      run: runRes.run,
      artifact,
      error: { code: "artifact_download_failed", message: `Artifact Download fehlgeschlagen (${zipRes.status} ${zipRes.message}).` },
    });
  }

  let artifactJson: unknown;
  try {
    const fileBuf = unzipFile(zipRes.data, GOVERNANCE_STATUS_FILENAME);
    const text = fileBuf.toString("utf8");
    artifactJson = JSON.parse(text) as unknown;
  } catch (e) {
    return buildBaseResponse({
      branch,
      generatedAt,
      run: runRes.run,
      artifact,
      error: {
        code: "artifact_parse_failed",
        message: "Artifact konnte nicht gelesen/geparst werden (ZIP/JSON).",
        details: { error: e instanceof Error ? e.message : "unknown" },
      },
    });
  }

  const normalized = normalizeArtifactJson(artifactJson);
  const base = buildBaseResponse({ branch, generatedAt, run: runRes.run, artifact });

  base.meta.generatedAt = normalized.artifactGeneratedAt ?? base.meta.generatedAt;
  base.checks.blueprint.violations = normalized.checks.blueprintViolations;
  base.checks.goldenTasks.items = normalized.checks.goldenTasksItems;
  base.checks.goldenTasks.counts.total = base.checks.goldenTasks.items.length;

  const gtIssues = base.checks.goldenTasks.items.filter((it) => {
    const r = asRecord(it);
    const ok = r ? r.ok : undefined;
    const status = r ? r.status : undefined;
    if (ok === false) return true;
    if (typeof status === "string" && /drift|fail|error|non-?compliant/i.test(status)) return true;
    return false;
  }).length;
  base.checks.goldenTasks.counts.issues = gtIssues;

  base.checks.prGovernance = {
    ...normalized.checks.prGovernance,
    warnOnly: true,
  };

  base.summary.counts.blueprintViolations = base.checks.blueprint.violations.length;
  base.summary.counts.goldenTasksIssues = gtIssues;

  if (normalized.artifactOverall) {
    base.summary.overall = normalized.artifactOverall;
  } else {
    base.summary.overall = deriveOverallFromCounts({
      blueprintViolations: base.summary.counts.blueprintViolations,
      goldenTasksIssues: base.summary.counts.goldenTasksIssues,
      prNonCompliant: base.summary.counts.prNonCompliant,
    });
  }

  if (includePRs) {
    const prsRes = await getOpenPrs({ token, owner: parts.owner, repo: parts.name, base: branch });
    if (prsRes.ok) {
      base.prs = prsRes.prs.map((pr) => {
        const missing = prMissingSections(pr.body);
        return {
          number: pr.number,
          title: pr.title,
          url: pr.html_url,
          author: pr.user?.login,
          base: pr.base?.ref,
          draft: pr.draft,
          updatedAt: pr.updated_at,
          compliant: missing.length === 0,
          missingSections: missing,
        };
      });
      base.summary.counts.openPrs = base.prs.length;
      base.summary.counts.prNonCompliant = base.prs.filter((p) => !p.compliant).length;
      base.checks.prGovernance = {
        ...base.checks.prGovernance,
        openPrs: {
          total: base.summary.counts.openPrs,
          nonCompliant: base.summary.counts.prNonCompliant,
          requiredSections: REQUIRED_PR_SECTIONS,
        },
      };
      base.summary.overall = deriveOverallFromCounts({
        blueprintViolations: base.summary.counts.blueprintViolations,
        goldenTasksIssues: base.summary.counts.goldenTasksIssues,
        prNonCompliant: base.summary.counts.prNonCompliant,
      });
    } else {
      base.error = base.error ?? prsRes.error;
    }
  }

  return base;
}

export function coerceGovernanceStatusResponse(input: unknown): GovernanceStatusResponse | null {
  const r = asRecord(input);
  if (!r) return null;
  const meta = asRecord(r.meta);
  const summary = asRecord(r.summary);
  const checks = asRecord(r.checks);
  if (!meta || !summary || !checks) return null;
  if (!asString(meta.generatedAt) || !asRecord(meta.workflow) || !asRecord(meta.artifact)) return null;
  if (!asString(summary.overall) || !asRecord(summary.counts)) return null;
  if (!asRecord(checks.blueprint) || !asRecord(checks.goldenTasks)) return null;

  // Trust but verify minimally; return input as-is when it looks like our shape.
  return input as GovernanceStatusResponse;
}

