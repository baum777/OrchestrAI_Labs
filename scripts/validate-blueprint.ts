import { execSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

type CanonicalLayer = "strategy" | "architecture" | "implementation" | "operations" | "evidence";

const REQUIRED_HEADERS = ["Purpose", "Scope", "Owner", "Layer", "Last Updated"] as const;

function runGitCommand(command: string): string[] {
  try {
    const output = execSync(command, { stdio: ["ignore", "pipe", "ignore"], encoding: "utf-8" });
    return output
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

function collectChangedDocsFiles(): string[] {
  const candidates = new Set<string>();

  const baseRef = process.env.BLUEPRINT_BASE_REF ?? process.env.GITHUB_BASE_REF;
  if (baseRef) {
    const fromBase = runGitCommand(`git diff --name-only origin/${baseRef}...HEAD -- docs`);
    fromBase.forEach((file) => candidates.add(file));
  }

  runGitCommand("git diff --name-only --cached -- docs").forEach((file) => candidates.add(file));
  runGitCommand("git diff --name-only -- docs").forEach((file) => candidates.add(file));

  // Fallback for clean tree/CI context.
  if (candidates.size === 0) {
    runGitCommand("git diff --name-only HEAD~1..HEAD -- docs").forEach((file) => candidates.add(file));
  }

  return [...candidates]
    .filter((file) => file.startsWith("docs/") && file.endsWith(".md"))
    .sort();
}

function checkHeader(content: string, key: typeof REQUIRED_HEADERS[number]): boolean {
  if (key === "Last Updated") {
    const regex = /(?:^\s*\*\*Last Updated:\*\*|^\s*Last Updated:)\s*([0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z)/m;
    return regex.test(content);
  }
  const regex = new RegExp(`(?:^\\s*\\*\\*${key}:\\*\\*|^\\s*${key}:)`, "m");
  return regex.test(content);
}

function parseCanonicalLayerMap(specContent: string): Map<CanonicalLayer, string> {
  const map = new Map<CanonicalLayer, string>();
  const regex = /^\|\s*(strategy|architecture|implementation|operations|evidence)\s*\|\s*`?([^`|]+?)`?\s*\|/gim;

  for (const match of specContent.matchAll(regex)) {
    const layer = match[1].toLowerCase() as CanonicalLayer;
    const rawPath = match[2].trim();
    if (!map.has(layer)) {
      map.set(layer, rawPath);
    }
  }

  return map;
}

function main(): void {
  const strict = process.env.ENFORCEMENT_STRICT === "1" || process.argv.includes("--strict");
  const issues: string[] = [];

  const cwd = process.cwd();
  const specPath = join(cwd, "docs", "DOCS_BLUEPRINT_SPEC.md");
  if (!existsSync(specPath)) {
    console.log("⚠️  Blueprint Spec fehlt: docs/DOCS_BLUEPRINT_SPEC.md");
    process.exit(strict ? 1 : 0);
  }

  const specContent = readFileSync(specPath, "utf-8");
  const canonicalMap = parseCanonicalLayerMap(specContent);

  const expectedLayers: CanonicalLayer[] = ["strategy", "architecture", "implementation", "operations", "evidence"];
  for (const layer of expectedLayers) {
    const mappedPath = canonicalMap.get(layer);
    if (!mappedPath) {
      issues.push(`Canonical Layer Mapping fehlt fuer Layer "${layer}" in docs/DOCS_BLUEPRINT_SPEC.md`);
      continue;
    }
    const absolute = join(cwd, mappedPath);
    if (!existsSync(absolute)) {
      issues.push(`Canonical File fuer Layer "${layer}" existiert nicht: ${mappedPath}`);
    }
  }

  const uniqueTargets = new Set([...canonicalMap.values()]);
  if (uniqueTargets.size !== canonicalMap.size) {
    issues.push("Canonical Layer Mapping enthaelt doppelte Zielpfade");
  }

  const changedDocsFiles = collectChangedDocsFiles();
  for (const file of changedDocsFiles) {
    const absolute = join(cwd, file);
    if (!existsSync(absolute)) {
      continue;
    }
    if (!statSync(absolute).isFile()) {
      continue;
    }
    const content = readFileSync(absolute, "utf-8");
    for (const headerKey of REQUIRED_HEADERS) {
      if (!checkHeader(content, headerKey)) {
        issues.push(`${file}: Pflicht-Header fehlt oder ist ungültig -> "${headerKey}"`);
      }
    }
  }

  if (changedDocsFiles.includes("docs/DOCS_BLUEPRINT_SPEC.md")) {
    const prTemplatePath = join(cwd, "PR_DESCRIPTION.md");
    if (!existsSync(prTemplatePath)) {
      issues.push("PR_DESCRIPTION.md fehlt, Golden Task Impact kann nicht geprueft werden");
    } else {
      const prTemplate = readFileSync(prTemplatePath, "utf-8");
      if (!/^##\s+Golden Task Impact\b/m.test(prTemplate)) {
        issues.push("Aenderung an docs/DOCS_BLUEPRINT_SPEC.md erfordert '## Golden Task Impact' in PR_DESCRIPTION.md");
      }
    }
  }

  console.log("=== Blueprint Structure Validation ===");
  console.log(`Mode: ${strict ? "strict" : "warn-only (phase-1)"}`);
  console.log(`Gepruefte geaenderte docs-Dateien: ${changedDocsFiles.length}`);

  if (issues.length === 0) {
    console.log("✅ Keine Blueprint-Verstoesse gefunden.");
    process.exit(0);
  }

  console.log(`⚠️  ${issues.length} Befund(e):`);
  for (const issue of issues) {
    console.log(` - ${issue}`);
  }

  if (strict) {
    console.log("❌ Strict Mode aktiv: Blueprint Check fehlgeschlagen.");
    process.exit(1);
  }

  console.log("🟡 Warn-only Mode: Build bleibt gruen (Phase 1).");
}

main();
