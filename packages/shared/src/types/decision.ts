export type DecisionStatus = "draft" | "final";

export type DecisionBase = {
  id: string;
  projectId: string;
  clientId?: string;
  title: string;
  owner: string;
  ownerRole?: string;
  status: DecisionStatus;
  createdAt: string;
  updatedAt: string;

  assumptions: string[];
  derivation?: string;
  alternatives: string[];
  risks: string[];

  clientContext?: string;
  commsContext?: string;
  clientImplications?: string;

  goal?: string;
  successCriteria: string[];
  nextSteps: string[];
  reviewAt?: string;

  reviewId?: string;
  draftId?: string;
};

export type DecisionDraft = DecisionBase & {
  status: "draft";
  reviewId?: string;
};

export type DecisionFinal = DecisionBase & {
  status: "final";
  reviewId: string;
};

