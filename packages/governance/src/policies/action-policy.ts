export interface ActionPolicy {
  id: string;
  name: string;
  allowedAgents: string[];
  requiredApprovals: number;
}

export const defaultActionPolicy: ActionPolicy = {
  id: "default-action",
  name: "Standard Action Policy",
  allowedAgents: ["agent-junior", "agent-documentation"],
  requiredApprovals: 1
};

