/**
 * Zod Schemas for Governance Status
 * Validates the governance status artifact structure
 */

import { z } from "zod";

// Status types
export const statusSchema = z.enum(["success", "warning", "error", "unknown", "ok"]);

// Evidence schema
export const evidenceSchema = z.object({
  sample: z.string(),
  location: z.string(),
  recommendation: z.string(),
});

// Reason schema
export const reasonSchema = z.object({
  code: z.string(),
  severity: z.enum(["error", "warning", "info"]),
  count: z.number().int().min(0),
  description: z.string(),
  affectedValidators: z.array(z.string()),
  evidence: evidenceSchema,
});

// Run schema
export const runSchema = z.object({
  id: z.string(),
  timestamp: z.string(), // ISO string, not Date
  status: z.enum(["success", "warning", "error", "unknown"]),
  validatorCount: z.number().int().min(0),
  violations: z.number().int().min(0),
  durationMs: z.number().int().min(0),
});

// Validator schema
export const validatorSchema = z.object({
  id: z.string(),
  name: z.string(),
  enabled: z.boolean(),
  lastRun: z.string(), // ISO string, not Date
  status: z.enum(["ok", "warning", "error", "unknown"]),
});

// CI Check schema
export const ciCheckSchema = z.object({
  name: z.string(),
  status: z.enum(["success", "warning", "error", "unknown", "pending"]),
});

// CI Health schema
export const ciHealthSchema = z.object({
  lastCommit: z.string(),
  branch: z.string(),
  status: z.enum(["success", "warning", "error", "unknown"]),
  checks: z.array(ciCheckSchema),
});

// Summary schema
export const summarySchema = z.object({
  totalRuns: z.number().int().min(0),
  successRate: z.number().min(0).max(100),
  avgDurationMs: z.number().int().min(0),
  activeValidators: z.number().int().min(0),
});

// Main governance status schema
export const governanceStatusSchema = z.object({
  generatedAt: z.string(), // ISO string, not Date
  overallStatus: z.enum(["success", "warning", "error", "unknown"]),
  runs: z.array(runSchema),
  validators: z.array(validatorSchema),
  reasons: z.array(reasonSchema),
  ciHealth: ciHealthSchema,
  summary: summarySchema,
});

// Type exports
export type GovernanceStatus = z.infer<typeof governanceStatusSchema>;
export type Run = z.infer<typeof runSchema>;
export type Validator = z.infer<typeof validatorSchema>;
export type Reason = z.infer<typeof reasonSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;
export type CiHealth = z.infer<typeof ciHealthSchema>;
export type CiCheck = z.infer<typeof ciCheckSchema>;
export type Summary = z.infer<typeof summarySchema>;
export type StatusValue = z.infer<typeof statusSchema>;
