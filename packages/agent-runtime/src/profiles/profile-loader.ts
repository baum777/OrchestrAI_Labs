import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import type { AgentProfile } from "@shared/types/agent";

const ReviewPolicySchema = z.object({
  mode: z.enum(["none", "draft_only", "required"]),
  requiresHumanFor: z.array(z.string()),
  reviewerRoles: z.array(z.enum(["partner", "senior", "admin"])),
  notes: z.string().optional(),
});

const EscalationRuleSchema = z.object({
  when: z.enum(["low_confidence", "missing_sources", "policy_block", "user_request"]),
  action: z.enum(["request_review", "handoff_to_human"]),
  minConfidence: z.number().optional(),
});

const MemoryScopeSchema = z.object({
  scope: z.enum(["global", "client", "project"]),
  retentionDays: z.number().int().positive(),
  pii: z.enum(["avoid", "allow_with_review"]),
});

const AgentProfileSchema = z.object({
  id: z.string().min(3),
  name: z.string().min(3),
  role: z.enum(["knowledge", "project", "documentation", "junior", "governance"]),
  objectives: z.array(z.string()).min(1),
  permissions: z.array(z.string()).min(1),
  tools: z.array(z.string()).min(1),
  allowedSkills: z.array(z.string()).optional(),
  escalationRules: z.array(EscalationRuleSchema),
  memoryScopes: z.array(MemoryScopeSchema),
  reviewPolicy: ReviewPolicySchema,
});

export type ProfileLoaderOptions = {
  profilesDir: string;
};

export class ProfileLoader {
  private cache = new Map<string, AgentProfile>();

  constructor(private readonly opts: ProfileLoaderOptions) {}

  loadAll(): AgentProfile[] {
    const dir = this.opts.profilesDir;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const profiles: AgentProfile[] = [];

    for (const e of entries) {
      if (!e.isFile() || !e.name.endsWith(".json")) continue;
      const p = path.join(dir, e.name);
      const raw = fs.readFileSync(p, "utf8");
      const parsed = JSON.parse(raw);

      const validated = AgentProfileSchema.parse(parsed) as AgentProfile;
      this.cache.set(validated.id, validated);
      profiles.push(validated);
    }
    return profiles;
  }

  getById(id: string): AgentProfile {
    const v = this.cache.get(id);
    if (!v) throw new Error(`AgentProfile not loaded: ${id}`);
    return v;
  }
}

