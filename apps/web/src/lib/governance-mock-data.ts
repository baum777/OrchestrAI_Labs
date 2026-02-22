/**
 * Governance mock data for API route fallback.
 * @deprecated Use public/mock/governance-status.json or real CI artifact.
 * TODO: Remove when API route uses real CI artifact retrieval.
 */

// Inline type to avoid importing from (dashboard) path
export const mockGovernanceStatus = {
  generatedAt: "2026-02-22T14:30:00.000Z",
  overallStatus: "warning",
  runs: [
    {
      id: "run-001",
      timestamp: "2026-02-22T14:00:00.000Z",
      status: "success",
      validatorCount: 5,
      violations: 0,
      durationMs: 1250,
    },
    {
      id: "run-002",
      timestamp: "2026-02-22T13:00:00.000Z",
      status: "warning",
      validatorCount: 5,
      violations: 2,
      durationMs: 980,
    },
    {
      id: "run-003",
      timestamp: "2026-02-22T12:00:00.000Z",
      status: "error",
      validatorCount: 4,
      violations: 3,
      durationMs: 1500,
    },
    {
      id: "run-004",
      timestamp: "2026-02-22T11:00:00.000Z",
      status: "success",
      validatorCount: 5,
      violations: 0,
      durationMs: 1100,
    },
    {
      id: "run-005",
      timestamp: "2026-02-22T10:00:00.000Z",
      status: "success",
      validatorCount: 5,
      violations: 0,
      durationMs: 1050,
    },
  ],
  validators: [
    {
      id: "val-001",
      name: "PII Detector",
      enabled: true,
      lastRun: "2026-02-22T14:00:00.000Z",
      status: "ok",
    },
    {
      id: "val-002",
      name: "Schema Validator",
      enabled: true,
      lastRun: "2026-02-22T14:00:00.000Z",
      status: "ok",
    },
    {
      id: "val-003",
      name: "Policy Checker",
      enabled: true,
      lastRun: "2026-02-22T14:00:00.000Z",
      status: "warning",
    },
    {
      id: "val-004",
      name: "Security Scanner",
      enabled: true,
      lastRun: "2026-02-22T14:00:00.000Z",
      status: "ok",
    },
    {
      id: "val-005",
      name: "Compliance Audit",
      enabled: false,
      lastRun: "2026-02-22T12:00:00.000Z",
      status: "unknown",
    },
  ],
  reasons: [
    {
      code: "PII_EXPOSED",
      severity: "error",
      count: 1,
      description: "Potentially identifiable information detected in output",
      affectedValidators: ["val-001"],
      evidence: {
        sample: "email_pattern_detected",
        location: "response.body.content",
        recommendation: "Apply PII redaction before output",
      },
    },
    {
      code: "SCHEMA_MISMATCH",
      severity: "warning",
      count: 2,
      description: "Output does not conform to expected schema",
      affectedValidators: ["val-002"],
      evidence: {
        sample: "missing_required_field: metadata",
        location: "response.body",
        recommendation: "Ensure all required fields are present",
      },
    },
    {
      code: "POLICY_VIOLATION",
      severity: "warning",
      count: 1,
      description: "Content violates defined policy rules",
      affectedValidators: ["val-003"],
      evidence: {
        sample: "restricted_keyword_found",
        location: "response.body.content",
        recommendation: "Review policy configuration",
      },
    },
  ],
  ciHealth: {
    lastCommit: "abc1234",
    branch: "main",
    status: "success",
    checks: [
      { name: "lint", status: "success" },
      { name: "test", status: "success" },
      { name: "build", status: "success" },
      { name: "typecheck", status: "success" },
    ],
  },
  summary: {
    totalRuns: 127,
    successRate: 94.5,
    avgDurationMs: 1120,
    activeValidators: 4,
  },
} as const;
