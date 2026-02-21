import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

interface RegistryEntry {
  id: string;
  name: string;
  scope: string;
  requiredFixture: string;
  ciRequired: string;
  minimumRequired: number;
}

function parseRegistry(filePath: string): RegistryEntry[] {
  const content = readFileSync(filePath, "utf-8");
  const entries: RegistryEntry[] = [];
  const rowRegex = /^\|\s*(GT-\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*(\d+)\s*\|$/gim;

  for (const match of content.matchAll(rowRegex)) {
    entries.push({
      id: match[1].trim(),
      name: match[2].trim(),
      scope: match[3].trim(),
      requiredFixture: match[4].trim(),
      ciRequired: match[5].trim(),
      minimumRequired: Number(match[6]),
    });
  }

  return entries;
}

function readFixtureIds(testdataRoot: string): string[] {
  if (!existsSync(testdataRoot)) {
    return [];
  }
  return readdirSync(testdataRoot)
    .filter((entry) => /^GT-\d+$/i.test(entry))
    .filter((entry) => statSync(join(testdataRoot, entry)).isDirectory())
    .sort();
}

function readDocsTaskIds(tasksRoot: string): string[] {
  if (!existsSync(tasksRoot)) {
    return [];
  }
  return readdirSync(tasksRoot)
    .filter((entry) => /^GT-\d+/i.test(entry) && entry.endsWith(".md"))
    .map((entry) => {
      const match = entry.match(/^(GT-\d+)/i);
      return match ? match[1].toUpperCase() : "";
    })
    .filter(Boolean)
    .sort();
}

function parseOpsGoldenTaskIds(yamlPath: string): { ids: string[]; minimumRequired: number | null } {
  if (!existsSync(yamlPath)) {
    return { ids: [], minimumRequired: null };
  }
  const content = readFileSync(yamlPath, "utf-8");
  const ids = [...content.matchAll(/\bid:\s*"?([A-Z]+-\d+)"?/g)].map((match) => match[1].toUpperCase());
  const minimumMatch = content.match(/\bminimum_required:\s*(\d+)/);
  return { ids: [...new Set(ids)].sort(), minimumRequired: minimumMatch ? Number(minimumMatch[1]) : null };
}

function main(): void {
  const strict = process.env.ENFORCEMENT_STRICT === "1" || process.argv.includes("--strict");
  const issues: string[] = [];

  const cwd = process.cwd();
  const registryPath = join(cwd, "docs", "golden-tasks", "GOLDEN_TASK_REGISTRY.md");
  const testdataRoot = join(cwd, "testdata", "golden-tasks");
  const docsTasksRoot = join(cwd, "docs", "golden-tasks", "tasks");
  const opsYamlPath = join(cwd, "ops", "agent-team", "golden_tasks.yaml");

  if (!existsSync(registryPath)) {
    console.log("⚠️  Registry fehlt: docs/golden-tasks/GOLDEN_TASK_REGISTRY.md");
    process.exit(strict ? 1 : 0);
  }

  const registry = parseRegistry(registryPath);
  if (registry.length === 0) {
    issues.push("Registry enthaelt keine GT-Eintraege");
  }

  const registryIds = new Set(registry.map((entry) => entry.id.toUpperCase()));
  const fixtureIds = new Set(readFixtureIds(testdataRoot).map((id) => id.toUpperCase()));
  const docsTaskIds = new Set(readDocsTaskIds(docsTasksRoot).map((id) => id.toUpperCase()));
  const ops = parseOpsGoldenTaskIds(opsYamlPath);
  const opsIds = new Set(ops.ids);

  // Rule: every GT in Registry must exist in testdata + ops yaml.
  for (const id of registryIds) {
    if (!fixtureIds.has(id)) {
      issues.push(`Registry-ID ${id} fehlt als Fixture-Verzeichnis in testdata/golden-tasks/`);
    }
    if (!opsIds.has(id)) {
      issues.push(`Registry-ID ${id} fehlt in ops/agent-team/golden_tasks.yaml`);
    }
  }

  // Rule: no fixture without registry entry.
  for (const fixtureId of fixtureIds) {
    if (!registryIds.has(fixtureId)) {
      issues.push(`Fixture ohne Registry-Eintrag: ${fixtureId}`);
    }
  }

  // Count consistency checks.
  if (registryIds.size !== docsTaskIds.size) {
    issues.push(`Count-Mismatch docs tasks (${docsTaskIds.size}) vs registry (${registryIds.size})`);
  }
  if (registryIds.size !== fixtureIds.size) {
    issues.push(`Count-Mismatch fixtures (${fixtureIds.size}) vs registry (${registryIds.size})`);
  }

  const minimumValues = [...new Set(registry.map((entry) => entry.minimumRequired))];
  if (minimumValues.length > 1) {
    issues.push("Registry enthaelt unterschiedliche Werte in Spalte 'Minimum Required'");
  }
  const registryMinimum = minimumValues[0] ?? null;
  if (registryMinimum !== null && ops.minimumRequired !== null && registryMinimum !== ops.minimumRequired) {
    issues.push(
      `minimum_required mismatch: registry=${registryMinimum} vs ops/agent-team/golden_tasks.yaml=${ops.minimumRequired}`
    );
  }

  // Required fixture file checks.
  for (const entry of registry) {
    if (!/^yes$/i.test(entry.requiredFixture)) {
      continue;
    }
    const fixtureDir = join(testdataRoot, entry.id);
    const inputPath = join(fixtureDir, "input.createDraft.json");
    const expectedPath = join(fixtureDir, "expected.assertions.json");
    if (!existsSync(inputPath)) {
      issues.push(`${entry.id}: required fixture file fehlt -> ${inputPath.replace(`${cwd}/`, "")}`);
    }
    if (!existsSync(expectedPath)) {
      issues.push(`${entry.id}: required fixture file fehlt -> ${expectedPath.replace(`${cwd}/`, "")}`);
    }
  }

  console.log("=== Golden Task Integrity Validation ===");
  console.log(`Mode: ${strict ? "strict" : "warn-only (phase-1)"}`);
  console.log(`Registry IDs: ${registryIds.size}, Docs Tasks: ${docsTaskIds.size}, Fixtures: ${fixtureIds.size}`);

  if (issues.length === 0) {
    console.log("✅ Golden Task Alignment ist konsistent.");
    process.exit(0);
  }

  console.log(`⚠️  ${issues.length} Befund(e):`);
  for (const issue of issues) {
    console.log(` - ${issue}`);
  }

  if (strict) {
    console.log("❌ Strict Mode aktiv: Golden Task Check fehlgeschlagen.");
    process.exit(1);
  }

  console.log("🟡 Warn-only Mode: Build bleibt gruen (Phase 1).");
}

main();
