/**
 * GATO Charter (Types Layer, non-runtime):
 * - Reduce friction/suffering
 * - Increase prosperity
 * - Increase understanding
 *
 * Heuristics:
 * - Transparency > Speed
 * - Review > Autonomy
 * - Stability > Novelty (core)
 * - Documentation > Cleverness
 *
 * Defense-in-Depth note:
 * - Shared Types are the first "Understanding" layer for auditability.
 */

export type DecisionStatus = "draft" | "final";

export type DecisionMeta = {
  id: string;
  projectId: string;
  clientId?: string;
  title: string;
  owner: string;
  ownerRole?: string;
  status: DecisionStatus;
  createdAt: string;
  updatedAt: string;
};

export type DecisionInternalWork = {
  assumptions: string[];
  derivation?: string;
  alternatives: string[];
  risks: string[];
};

export type DecisionClientContext = {
  clientContext?: string;
  commsContext?: string;
  clientImplications?: string;
};

export type DecisionOutcome = {
  goal?: string;
  successCriteria: string[];
  nextSteps: string[];
  reviewAt?: string;
};

export type DecisionGovernanceReference = {
  reviewId?: string;
  draftId?: string;
};

export type DecisionBase =
  & DecisionMeta
  & DecisionInternalWork
  & DecisionClientContext
  & DecisionOutcome
  & DecisionGovernanceReference;

export type DecisionDraft = DecisionBase & {
  status: "draft";
  reviewId?: string;
};

export type DecisionFinal = DecisionBase & {
  status: "final";
  reviewId: string; // invariant: required
};

