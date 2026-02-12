export interface ReviewPolicy {
  id: string;
  name: string;
  requiresHumanApproval: boolean;
  reviewSteps: string[];
}

export const governanceReviewPolicy: ReviewPolicy = {
  id: "gov-review",
  name: "Governance Review Policy",
  requiresHumanApproval: true,
  reviewSteps: ["Log snapshot", "Policy comparison", "Escalate on violation"]
};

