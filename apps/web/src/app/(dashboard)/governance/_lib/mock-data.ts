/**
 * Mock Governance Status Data
 * @deprecated Use API route /api/governance/status instead.
 * Kept as dev fallback when public/mock/governance-status.json is missing.
 * TODO: Remove when API route uses real CI artifact retrieval.
 */

import type { GovernanceStatus } from "./governance-status.schema";
import { mockGovernanceStatus as _mock } from "../../../../lib/governance-mock-data";

export const mockGovernanceStatus: GovernanceStatus = _mock as unknown as GovernanceStatus;
