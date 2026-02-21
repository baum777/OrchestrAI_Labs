import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REQUIRED_SECTIONS = [
  "## Change Summary",
  "## Risk Assessment",
  "## Rollback Strategy",
  "## Verification Plan",
  "## Golden Task Impact",
  "## Ops Evidence Updated",
];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function main(): void {
  const strict = process.env.ENFORCEMENT_STRICT === "1" || process.argv.includes("--strict");
  const prBodyPath = process.env.PR_BODY_FILE
    ? join(process.cwd(), process.env.PR_BODY_FILE)
    : join(process.cwd(), "PR_DESCRIPTION.md");

  const issues: string[] = [];

  if (!existsSync(prBodyPath)) {
    console.log(`⚠️  PR body file nicht gefunden: ${prBodyPath}`);
    process.exit(strict ? 1 : 0);
  }

  const content = readFileSync(prBodyPath, "utf-8");

  for (const section of REQUIRED_SECTIONS) {
    const sectionRegex = new RegExp(`^${escapeRegex(section)}\\s*$`, "m");
    if (!sectionRegex.test(content)) {
      issues.push(`Pflicht-Section fehlt: ${section}`);
    }
  }

  const goldenImpactSectionMatch = content.match(
    /##\s+Golden Task Impact\b([\s\S]*?)(?:\n##\s+|\n?$)/m
  );
  if (!goldenImpactSectionMatch) {
    issues.push("Section '## Golden Task Impact' fehlt oder ist nicht parsebar");
  } else {
    const sectionBody = goldenImpactSectionMatch[1] ?? "";
    const checkboxRegex = /-\s*\[[ xX]\]\s+/;
    if (!checkboxRegex.test(sectionBody)) {
      issues.push("Section '## Golden Task Impact' enthaelt keine Checkbox");
    }
  }

  console.log("=== PR Governance Schema Validation ===");
  console.log(`Mode: ${strict ? "strict" : "warn-only (phase-1)"}`);
  console.log(`PR Body Source: ${prBodyPath.replace(`${process.cwd()}/`, "")}`);

  if (issues.length === 0) {
    console.log("✅ PR Governance Schema ist valide.");
    process.exit(0);
  }

  console.log(`⚠️  ${issues.length} Befund(e):`);
  for (const issue of issues) {
    console.log(` - ${issue}`);
  }

  if (strict) {
    console.log("❌ Strict Mode aktiv: PR Template Check fehlgeschlagen.");
    process.exit(1);
  }

  console.log("🟡 Warn-only Mode: Build bleibt gruen (Phase 1).");
}

main();
