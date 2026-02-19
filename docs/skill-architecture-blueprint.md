# Skill Architecture Blueprint
**Based on IST-ZUSTAND Audit (2026-02-18)**

---

## A) Skill Architecture Blueprint

### 1. Goals & Non-goals

#### Goals
- Add skills as first-class citizens with discovery, versioning, and metadata
- Support lazy loading (instructions/resources loaded on demand)
- Integrate with existing governance gates (Orchestrator, ToolRouter, PolicyEngine, ReviewStore)
- Enable incremental adoption (skills coexist with existing tool handlers)
- Provide production-ready templates and examples
- Add observability (telemetry, version tracking, audit logs)

#### Non-goals
- **Do NOT** remove or bypass ToolRouter (skills must execute via ToolRouter)
- **Do NOT** bypass review/commit token logic (skills use existing ReviewStore flow)
- **Do NOT** create new customer data access paths (skills use existing `tool.customer_data.*` tools)
- **Do NOT** replace agent profiles (skills complement profiles, do not replace them)
- **Do NOT** create new time abstractions (skills use existing Clock interface)
- **Do NOT** bypass governance v2 validators (skills generate workstreams that are validated)
- **Do NOT** create new logging systems (skills use existing ActionLogger)
- **Do NOT** require big-bang migration (skills are opt-in, incremental)

---

### 2. Concepts & Definitions

| Concept | Definition | Relationship |
|---------|------------|--------------|
| **Skill** | A reusable, versioned capability with metadata, instructions, and deterministic execution plan. Skills map to sequences of tool calls. | Higher-level abstraction than tools |
| **Tool** | Atomic operation handler registered in ToolRouter (e.g., `tool.decisions.createDraft`). | Skills compose tools |
| **Agent Profile** | Static JSON definition of agent capabilities (permissions, tools, escalation rules). Profiles can reference allowed skills. | Profiles declare skill access |
| **Workflow Phase** | YAML-defined project phase with transitions. Skills can be used within phases. | Skills can be invoked in workflow context |
| **Tool Handler** | Implementation of a tool (registered in `agents.runtime.ts`). | Skills call tools via ToolRouter |
| **Workstream** | Governance v2 concept: structured work unit with owner, scope, layer, autonomy tier. Skills generate workstreams. | Skills produce workstreams for validation |

**Key Distinction:** Skills are **declarative plans** (instructions + metadata) that compile to **deterministic tool call sequences**. Tools are **imperative handlers** that execute operations.

---

### 3. Skill Spec

#### TypeScript Interfaces

```typescript
// packages/skills/src/spec/skill.types.ts

import type { Clock } from '@agent-system/governance-v2/runtime/clock';
import type { ToolContext, ToolCall, ToolResult } from '@agent-runtime/execution/tool-router';
import type { AgentProfile } from '@shared/types/agent';
import type { ValidationResult } from '@agent-system/governance-v2/types/governance.types';

/**
 * Skill manifest (JSON/YAML file)
 */
export interface SkillManifest {
  // Identity
  id: string;                    // e.g., "governance.workstream_validate"
  name: string;                   // Human-readable name
  version: string;                 // Semantic version (e.g., "1.0.0")
  description: string;             // Short description
  
  // Metadata
  tags: string[];                  // e.g., ["governance", "validation"]
  owners: string[];               // e.g., ["@teamlead_orchestrator"]
  layer: 'strategy' | 'architecture' | 'implementation' | 'governance';
  autonomyTier: 1 | 2 | 3 | 4;   // From autonomy_policy.md
  
  // Requirements
  requiredPermissions: string[];  // e.g., ["governance.read"]
  requiredTools: string[];        // e.g., ["tool.decisions.createDraft"]
  dependencies?: SkillDependency[]; // Other skills this depends on
  capabilityDomain?: string;      // e.g., "customer_data", "governance"
  
  // Customer Data Access
  customerDataAccess?: {
    enabled: boolean;
    allowedOperations?: string[];  // e.g., ["executeReadModel", "getEntity"]
  };
  
  // Context Requirements
  contextRequirements?: {
    projectId?: boolean;
    clientId?: boolean;
    userId: boolean;               // Always required
  };
  
  // Schemas
  inputSchema: JSONSchema;         // JSON Schema for input validation
  outputSchema: JSONSchema;        // JSON Schema for output validation
  sideEffects: SideEffect[];       // What this skill modifies
  
  // Review Policy
  reviewPolicy: {
    mode: 'none' | 'draft_only' | 'required';
    requiresHumanFor?: string[];   // Conditions requiring human review
    reviewerRoles?: string[];      // e.g., ["reviewer_claude"]
  };
  
  // Resources
  resources: {
    instructions: string;          // Path to instructions.md (relative to skill dir)
    examples?: string[];           // Paths to example files
    templates?: string[];          // Paths to template files
  };
  
  // Telemetry
  telemetry: {
    trackExecution: boolean;       // Whether to emit telemetry events
    trackLatency: boolean;         // Whether to track execution time
    trackErrors: boolean;           // Whether to track errors
  };
  
  // Governance
  governance: {
    generatesWorkstream: boolean;  // Whether skill generates workstream for validation
    requiresDocumentHeader?: boolean; // Whether skill validates document headers
    timestampIntegrity?: boolean;  // Whether skill enforces timestamp integrity
  };
}

export interface SkillDependency {
  skillId: string;
  versionRange: string;            // e.g., "^1.0.0"
}

export interface SideEffect {
  type: 'create' | 'update' | 'delete' | 'read';
  resource: string;                // e.g., "decision", "document", "action_log"
  scope?: 'project' | 'client' | 'global';
}

export interface JSONSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  // ... standard JSON Schema fields
}

/**
 * Skill execution context (passed to skill executor)
 */
export interface SkillExecutionContext {
  skillId: string;
  skillVersion: string;
  agentProfile: AgentProfile;
  toolContext: ToolContext;
  clock: Clock;
  input: unknown;
  metadata?: Record<string, unknown>;
}

/**
 * Skill execution result
 */
export interface SkillExecutionResult {
  ok: boolean;
  output?: unknown;
  error?: string;
  toolCalls: ToolCall[];           // Tool calls that were executed
  workstream?: Workstream;         // Generated workstream (if applicable)
  telemetry?: SkillTelemetry;
}

export interface SkillTelemetry {
  skillId: string;
  version: string;
  executionTimeMs: number;
  toolCallCount: number;
  errorCount: number;
  timestamp: string;               // ISO-8601
}

/**
 * Skill plan (deterministic compilation of instructions to tool calls)
 */
export interface SkillPlan {
  skillId: string;
  version: string;
  input: unknown;
  toolCalls: ToolCall[];
  workstream?: Workstream;
  reviewRequired: boolean;
  reviewPolicy: SkillManifest['reviewPolicy'];
}
```

#### JSON/YAML Manifest Schema

```yaml
# packages/skills/src/spec/skill-manifest.schema.yaml
# JSON Schema for skill manifests

type: object
required:
  - id
  - name
  - version
  - description
  - tags
  - owners
  - layer
  - autonomyTier
  - requiredPermissions
  - requiredTools
  - inputSchema
  - outputSchema
  - sideEffects
  - reviewPolicy
  - resources
  - telemetry

properties:
  id:
    type: string
    pattern: '^[a-z0-9._-]+$'
    description: "Skill identifier (e.g., 'governance.workstream_validate')"
  
  name:
    type: string
    minLength: 3
  
  version:
    type: string
    pattern: '^\\d+\\.\\d+\\.\\d+$'
  
  description:
    type: string
    minLength: 10
  
  tags:
    type: array
    items:
      type: string
  
  owners:
    type: array
    items:
      type: string
      pattern: '^@[a-z0-9_]+$'
  
  layer:
    type: string
    enum: [strategy, architecture, implementation, governance]
  
  autonomyTier:
    type: integer
    enum: [1, 2, 3, 4]
  
  requiredPermissions:
    type: array
    items:
      type: string
  
  requiredTools:
    type: array
    items:
      type: string
  
  dependencies:
    type: array
    items:
      type: object
      required: [skillId, versionRange]
      properties:
        skillId:
          type: string
        versionRange:
          type: string
  
  capabilityDomain:
    type: string
  
  customerDataAccess:
    type: object
    properties:
      enabled:
        type: boolean
      allowedOperations:
        type: array
        items:
          type: string
  
  contextRequirements:
    type: object
    properties:
      projectId:
        type: boolean
      clientId:
        type: boolean
      userId:
        type: boolean
        default: true
  
  inputSchema:
    type: object
    # JSON Schema object
  
  outputSchema:
    type: object
    # JSON Schema object
  
  sideEffects:
    type: array
    items:
      type: object
      required: [type, resource]
      properties:
        type:
          type: string
          enum: [create, update, delete, read]
        resource:
          type: string
        scope:
          type: string
          enum: [project, client, global]
  
  reviewPolicy:
    type: object
    required: [mode]
    properties:
      mode:
        type: string
        enum: [none, draft_only, required]
      requiresHumanFor:
        type: array
        items:
          type: string
      reviewerRoles:
        type: array
        items:
          type: string
  
  resources:
    type: object
    required: [instructions]
    properties:
      instructions:
        type: string
      examples:
        type: array
        items:
          type: string
      templates:
        type: array
        items:
          type: string
  
  telemetry:
    type: object
    required: [trackExecution, trackLatency, trackErrors]
    properties:
      trackExecution:
        type: boolean
      trackLatency:
        type: boolean
      trackErrors:
        type: boolean
  
  governance:
    type: object
    properties:
      generatesWorkstream:
        type: boolean
      requiresDocumentHeader:
        type: boolean
      timestampIntegrity:
        type: boolean
```

---

### 4. Skill Discovery & Loading

#### Where Manifests Live

```
packages/skills/
  skills/
    <skill-id>/
      manifest.json          # Skill manifest
      instructions.md        # Instructions (loaded on demand)
      resources/            # Optional resources
        examples/
        templates/
      code/                  # Optional TypeScript implementation (if needed)
        index.ts
```

**Discovery Pattern:** File system scan of `packages/skills/skills/*/manifest.json` at startup (similar to `ProfileLoader`).

#### Metadata-First Discovery

1. **Startup:** `SkillRegistry.loadAll()` scans `packages/skills/skills/*/manifest.json`
2. **Validation:** Validates manifest against JSON Schema (Zod or JSON Schema validator)
3. **Caching:** Stores manifest metadata in-memory Map (like `ProfileLoader`)
4. **Lazy Loading:** Instructions and resources loaded on-demand when skill is executed

**Implementation:**
```typescript
// packages/skills/src/registry/skill-registry.ts

export class SkillRegistry {
  private manifests = new Map<string, SkillManifest>();
  private instructionsCache = new Map<string, string>(); // skillId -> instructions content
  
  loadAll(skillsDir: string): SkillManifest[] {
    // Scan filesystem, load manifests, validate, cache
  }
  
  getManifest(skillId: string, version?: string): SkillManifest | null {
    // Return cached manifest (version matching if specified)
  }
  
  async loadInstructions(skillId: string): Promise<string> {
    // Lazy load instructions.md if not cached
  }
}
```

#### Lazy Loading Strategy

- **Manifests:** Loaded at startup (metadata-only, fast)
- **Instructions:** Loaded on-demand when skill is executed (first time only, then cached)
- **Resources:** Loaded on-demand if referenced in instructions
- **Code:** Only loaded if skill has custom TypeScript implementation (rare)

**Caching:**
- In-memory Map (similar to `ProfileLoader`)
- No TTL (skills are static during runtime)
- Cache invalidation: Restart required (no hot-reload in Phase 1)

---

### 5. Skill Execution Model

#### How a Skill Maps to Tool Calls

1. **Skill Request:** Agent requests skill execution via `POST /agents/execute` with `skillId` and `input`
2. **Skill Compilation:** `SkillExecutor.compile()` reads instructions, compiles to deterministic `SkillPlan` (sequence of tool calls)
3. **Governance Preflight:** If `governance.generatesWorkstream`, create workstream and validate via `WorkstreamValidator`
4. **Review Gate:** Check `reviewPolicy.mode` and `autonomyTier`, create review request if needed
5. **Tool Execution:** Execute tool calls via existing `ToolRouter.execute()` (no bypass)
6. **Audit Logging:** Log skill execution via existing `ActionLogger.append()`

#### Deterministic Skill Plan

```typescript
// packages/skills/src/executor/skill-executor.ts

export class SkillExecutor {
  async compile(
    manifest: SkillManifest,
    instructions: string,
    input: unknown,
    context: SkillExecutionContext
  ): Promise<SkillPlan> {
    // Parse instructions.md
    // Extract tool call sequence (deterministic)
    // Generate workstream if needed
    // Return SkillPlan
  }
  
  async execute(
    plan: SkillPlan,
    context: SkillExecutionContext,
    toolRouter: ToolRouter
  ): Promise<SkillExecutionResult> {
    // Execute tool calls via ToolRouter
    // Collect results
    // Generate telemetry
    // Return result
  }
}
```

**Determinism:** Instructions are parsed into a deterministic sequence of tool calls. Same input → same tool calls (no randomness, no LLM calls in skill execution).

#### Governance Preflight (Orchestrator Hook)

**Location:** `packages/agent-runtime/src/orchestrator/orchestrator.ts` (after gap detection, before review gate)

**Integration Point:**
```typescript
// In Orchestrator.run(), after line 178 (gap detection), before line 202 (governance v2 validation)

if (input.skillId) {
  // Skill execution path
  const skillRegistry = this.skillRegistry; // Injected dependency
  const manifest = skillRegistry.getManifest(input.skillId, input.skillVersion);
  
  if (!manifest) {
    return { status: 'blocked', data: { reason: 'SKILL_NOT_FOUND' } };
  }
  
  // Check permissions
  if (!this.hasSkillPermission(profile, manifest)) {
    return { status: 'blocked', data: { reason: 'SKILL_PERMISSION_DENIED' } };
  }
  
  // Compile skill plan
  const skillExecutor = this.skillExecutor; // Injected dependency
  const instructions = await skillRegistry.loadInstructions(input.skillId);
  const plan = await skillExecutor.compile(manifest, instructions, input.skillInput, {
    skillId: input.skillId,
    skillVersion: manifest.version,
    agentProfile: profile,
    toolContext: ctx,
    clock: this.clock,
    input: input.skillInput,
  });
  
  // Governance v2 validation (if generatesWorkstream)
  if (plan.workstream && this.governanceValidator) {
    const govResult = await this.governanceValidator.validateWorkstream(plan.workstream);
    if (govResult.status === 'blocked') {
      // ... existing blocking logic
    }
  }
  
  // Review gate (if needed)
  if (plan.reviewRequired) {
    // ... existing review gate logic
  }
  
  // Execute skill plan (tool calls via ToolRouter)
  const result = await skillExecutor.execute(plan, { ... }, this.toolRouter);
  
  // Log skill execution
  await this.logger.append({
    agentId: profile.id,
    userId: ctx.userId,
    projectId: ctx.projectId,
    clientId: ctx.clientId,
    action: 'skill.executed',
    input: { skillId: input.skillId, version: manifest.version, input: input.skillInput },
    output: result.output,
    ts: this.clock.now().toISOString(),
    blocked: !result.ok,
  });
  
  return { status: result.ok ? 'ok' : 'blocked', data: result };
}
```

#### Review Gates (Existing Flow)

Skills use existing review flow:
- If `reviewPolicy.mode === 'required'` → Create review request via `ReviewStore.create()`
- If `reviewPolicy.mode === 'draft_only'` → Execute in draft mode (no finalization)
- If commit token provided → Verify via `ReviewStore.getApprovedForCommit()` (existing logic)

**No new review logic** — skills reuse existing `ReviewStore` and commit token verification.

#### Audit Logging (Existing Flow)

Skills log via existing `ActionLogger`:
- Action: `skill.executed`
- Input: `{ skillId, version, input }`
- Output: Skill execution result
- Telemetry: Included in output if `telemetry.trackExecution === true`

**Additional Logging:**
- `skill.compiled` → When skill plan is compiled (for debugging)
- `skill.blocked.governance` → When skill is blocked by governance validation
- `skill.blocked.permission` → When skill permission is denied

---

### 6. Integration Points

#### Orchestrator Changes

**File:** `packages/agent-runtime/src/orchestrator/orchestrator.ts`

**Changes:**
1. Add optional `skillRegistry` and `skillExecutor` constructor parameters
2. Add skill execution path in `run()` method (after gap detection, before governance v2 validation)
3. Add `hasSkillPermission()` helper method

**Risk:** Low (skill path is opt-in, existing tool path unchanged)

#### ToolRouter Changes

**File:** `packages/agent-runtime/src/execution/tool-router.ts`

**Changes:** None (skills execute via ToolRouter, no changes needed)

#### Profiles Changes

**File:** `packages/shared/src/types/agent.ts`

**Changes:**
1. Add optional `skills?: string[]` field to `AgentProfile` type
2. Update Zod schema in `ProfileLoader` to allow `skills` field

**File:** `packages/agent-runtime/src/profiles/profile-loader.ts`

**Changes:**
1. Update `AgentProfileSchema` to include optional `skills` array

**Risk:** Low (optional field, backward compatible)

#### apps/api Changes

**File:** `apps/api/src/modules/agents/agents.controller.ts`

**Changes:**
1. Update `ExecuteDto` to allow `skillId`, `skillVersion`, `skillInput` (optional, alongside existing `intendedAction`)

**File:** `apps/api/src/modules/agents/agents.runtime.ts`

**Changes:**
1. Import `SkillRegistry` and `SkillExecutor`
2. In `createOrchestrator()`, create `SkillRegistry` and `SkillExecutor` instances
3. Pass to `Orchestrator` constructor

**Risk:** Low (skill path is opt-in, existing path unchanged)

#### apps/web Changes

**File:** `apps/web/src/app/(dashboard)/approval/page.tsx`

**Changes:**
1. Display `skillId` and `version` in approval UI (if present in review request)

**File:** `apps/web/src/app/(dashboard)/audit/page.tsx`

**Changes:**
1. Display `skillId` and `version` in audit log (if present in action log)

**Risk:** Low (UI changes are additive)

---

### 7. Migration Strategy

#### Phase 0: Framework + Templates (No Behavior Change)

**Deliverables:**
- `packages/skills/` package structure
- `SkillRegistry`, `SkillExecutor` implementations
- Template library (manifest, instructions, examples)
- Integration code (Orchestrator, apps/api) with feature flag

**Feature Flag:** `ENABLE_SKILLS=false` (default, skills disabled)

**Risk:** None (no behavior change if flag is off)

#### Phase 1: Implement 1-2 Skills (Parallel with Existing Flow)

**Deliverables:**
- `governance.workstream_validate` skill
- `governance.doc_header_validate` skill
- Enable feature flag for testing
- E2E tests

**Risk:** Low (skills are opt-in, existing flow unchanged)

#### Phase 2: Discovery + Agent Requests

**Deliverables:**
- Agent profiles can reference skills
- Agents can request skills via `/agents/execute`
- Skill discovery UI (optional)
- Documentation

**Risk:** Medium (requires agent profile updates)

---

### 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Skill execution bypasses governance | High | Skills must go through Orchestrator governance hooks, no bypass |
| Skill version conflicts | Medium | Version range matching in dependencies, registry validates |
| Skill instructions not deterministic | High | Instructions parser enforces deterministic tool call sequences |
| Performance (lazy loading) | Low | Instructions cached after first load, manifests loaded at startup |
| Skill code execution security | Medium | Skills execute via ToolRouter (existing security), no eval() |
| Breaking changes in skill API | Medium | Versioning, semantic versioning, backward compatibility checks |
| Skill discovery performance | Low | File system scan at startup only, cached in-memory |

---

### 9. Definition of Done Checklist

- [ ] `packages/skills/` package structure created
- [ ] `SkillRegistry` loads manifests at startup, validates, caches
- [ ] `SkillExecutor` compiles instructions to deterministic tool call sequences
- [ ] Orchestrator integration (skill execution path, governance hooks)
- [ ] ToolRouter integration (skills execute via ToolRouter, no changes needed)
- [ ] Review flow integration (skills use existing ReviewStore)
- [ ] Audit logging integration (skills log via ActionLogger)
- [ ] Template library (manifest, instructions, examples)
- [ ] 5 example skills implemented (governance.workstream_validate, governance.doc_header_validate, runtime.time_gap_audit, customer_data.read_safe, knowledge.search_project)
- [ ] Unit tests (SkillRegistry, SkillExecutor with FakeClock)
- [ ] Integration tests (Orchestrator + SkillExecutor + ToolRouter mocked)
- [ ] E2E tests (golden tasks style)
- [ ] Documentation (skill authoring guide, integration guide)
- [ ] Feature flag (`ENABLE_SKILLS`) with default `false`
- [ ] Backward compatibility (existing tool flow unchanged)

---

## Guardrails v1

**Status:** ✅ Implemented (2026-02-18)  
**Purpose:** Minimal, high-leverage guardrail layer that prevents ToolRouter/Review/Policy/Clock bypass, enforces manifest contracts, reduces skill sprawl risk, and adds essential observability.

### Non-Negotiable Invariants (block on violation)

1. **No ToolRouter bypass:** All tool usage must route through ToolRouter.
2. **Direct skills are allowlist-only:** `mode=direct` only for known safe skillIds.
3. **No silent writes:** `sideEffects` must be declared; if not `none`, enforce review gate.
4. **Review gate is binding:** `reviewPolicy` is enforced via existing ReviewStore flow.
5. **Clock-only time:** No Date/setTimeout usage in skill code.
6. **Audit required:** Every skill run logs skillId/version/skillRunId/status/durationMs.

### Manifest Guardrails (schema + policy binding)

- **Manifest is schema-strict:** Fail fast at discovery time via `assertSkillManifest()`.
- **Policy-binding:**
  - `customerDataAccess=true` => tool plan may only include `customer_data.*` tools
  - `sideEffects` includes write/delete/config => `review_required` (at minimum)
  - `requiredTools` must be declared and must match tool plan
- **Versioning:** Semver required, exact match for now.
- **Ownership:** Owners required (min 1, max 3).
- **Lifecycle:** Status required: `experimental|stable|deprecated|disabled`

### Execution Guardrails (runtime checks)

Before executing any skill:
- Feature flag must be enabled (`SKILLS_ENABLED=true`) else block with reason `"skills_disabled"`
- Skill must be allowlisted by agent profile (`profile.allowedSkills` or `profile.skills`) if defined
- Permission intersection: `skill.requiredPermissions ⊆ profile.permissions` else block
- Tool intersection: `skill.requiredTools ⊆ profile.tools` else block
- `sideEffects` gating: if `sideEffects != none` => enforce `review_required` (or stronger) using existing Orchestrator review path
- `customerDataAccess`: Enforce tool plan tools subset rule
- Status check: Block if `status=disabled`, warn if `status=deprecated`, block experimental in production
- Emit action logs: `skill.requested`, `skill.executed` or `skill.blocked` with enriched metadata

### Sprawl Control (minimal)

- Block if `status=disabled`
- Warn (log) if `status=deprecated`
- In production mode (`NODE_ENV=production`), only allow `stable` unless explicitly overridden

### Observability Fields

Action log payload includes optional fields:
- `skillId`, `skillVersion`, `skillRunId`, `skillStatus`, `skillDurationMs`, `skillBlockReason`

These are stored in `action_logs.output_json` as JSONB for queryability.

### Implementation

- **Manifest Validator:** `packages/skills/src/registry/skill-manifest-validator.ts`
- **Runtime Guardrails:** `packages/skills/src/guardrails/skill-guardrails.ts`
- **Orchestrator Integration:** Guardrails called before skill execution in `packages/agent-runtime/src/orchestrator/orchestrator.ts`
- **Action Logger Enrichment:** `packages/agent-runtime/src/orchestrator/orchestrator.ts` and `apps/api/src/runtime/postgres-action-logger.ts`

### Rollback Strategy

- Feature flag `SKILLS_ENABLED=false` disables skill execution path
- Git revert all commits if needed
- No database migrations (skill metadata stored in JSONB)

---

## B) Concrete Folder Structure Proposal

```
packages/skills/
  package.json
  tsconfig.json
  README.md
  src/
    index.ts                          # Public API exports
    spec/
      skill.types.ts                  # TypeScript interfaces
      skill-manifest.schema.yaml       # JSON Schema for validation
      skill-manifest.schema.ts         # Zod schema (generated or manual)
    registry/
      skill-registry.ts                # Manifest loading, caching, discovery
      skill-validator.ts               # Manifest validation
    loader/
      instruction-loader.ts            # Lazy loading of instructions.md
      resource-loader.ts               # Lazy loading of resources
    executor/
      skill-executor.ts                # Skill compilation and execution
      instruction-parser.ts             # Parse instructions.md to tool calls
      workstream-generator.ts           # Generate workstreams from skill plans
    telemetry/
      skill-telemetry.ts                # Telemetry collection and emission
    templates/
      manifest.template.json            # Manifest template with comments
      instructions.template.md          # Instructions template
      test.template.ts                  # Test template
  skills/
    governance.workstream_validate/
      manifest.json
      instructions.md
      resources/
        examples/
          example-1.json
      code/
        index.ts                        # Optional custom implementation
    governance.doc_header_validate/
      manifest.json
      instructions.md
    runtime.time_gap_audit/
      manifest.json
      instructions.md
    customer_data.read_safe/
      manifest.json
      instructions.md
    knowledge.search_project/
      manifest.json
      instructions.md
  __tests__/
    unit/
      skill-registry.test.ts
      skill-executor.test.ts
      instruction-parser.test.ts
    integration/
      orchestrator-integration.test.ts
    e2e/
      skill-execution.e2e.test.ts
```

---

## C) Template Library

### 1. Skill Manifest Template

```json
{
  "$schema": "../src/spec/skill-manifest.schema.yaml",
  "id": "governance.workstream_validate",
  "name": "Workstream Validator",
  "version": "1.0.0",
  "description": "Validates a workstream against governance v2 rules (owner, scope, structural model, risks, layer, autonomy tier, DoD)",
  
  "tags": ["governance", "validation", "workstream"],
  "owners": ["@teamlead_orchestrator"],
  "layer": "governance",
  "autonomyTier": 2,
  
  "requiredPermissions": ["governance.read"],
  "requiredTools": [],
  "dependencies": [],
  "capabilityDomain": "governance",
  
  "customerDataAccess": {
    "enabled": false
  },
  
  "contextRequirements": {
    "projectId": false,
    "clientId": false,
    "userId": true
  },
  
  "inputSchema": {
    "type": "object",
    "required": ["workstream"],
    "properties": {
      "workstream": {
        "type": "object",
        "required": ["owner", "scope", "structuralModel", "risks", "layer", "autonomyTier", "definitionOfDone"],
        "properties": {
          "owner": { "type": "string" },
          "scope": { "type": "array", "items": { "type": "string" } },
          "structuralModel": { "type": "string" },
          "risks": { "type": "array" },
          "layer": { "type": "string", "enum": ["strategy", "architecture", "implementation", "governance"] },
          "autonomyTier": { "type": "integer", "enum": [1, 2, 3, 4] },
          "definitionOfDone": { "type": "string" }
        }
      }
    }
  },
  
  "outputSchema": {
    "type": "object",
    "required": ["status"],
    "properties": {
      "status": { "type": "string", "enum": ["pass", "blocked", "conflict", "clarification_required"] },
      "reasons": { "type": "array", "items": { "type": "string" } },
      "requiresReview": { "type": "boolean" }
    }
  },
  
  "sideEffects": [
    {
      "type": "read",
      "resource": "workstream",
      "scope": "global"
    }
  ],
  
  "reviewPolicy": {
    "mode": "none"
  },
  
  "resources": {
    "instructions": "instructions.md",
    "examples": ["resources/examples/example-1.json"]
  },
  
  "telemetry": {
    "trackExecution": true,
    "trackLatency": true,
    "trackErrors": true
  },
  
  "governance": {
    "generatesWorkstream": false,
    "requiresDocumentHeader": false,
    "timestampIntegrity": false
  }
}
```

### 2. Instructions Template

```markdown
# Skill: governance.workstream_validate

## Purpose
Validates a workstream against governance v2 rules to ensure it meets all required fields and constraints before execution.

## When to Use
- Before starting a new workstream
- When validating workstream structure for compliance
- As a preflight check in governance workflows

## Inputs
- `workstream` (object, required): Workstream to validate
  - `owner` (string, required): Owner identifier (e.g., "@teamlead_orchestrator")
  - `scope` (array of strings, required): Scope paths (e.g., ["packages/governance-v2/**"])
  - `structuralModel` (string, required): Structural model description
  - `risks` (array, required): Risk array (can be empty)
  - `layer` (string, required): Layer tag (strategy|architecture|implementation|governance)
  - `autonomyTier` (integer, required): Autonomy tier (1-4)
  - `definitionOfDone` (string, required): Definition of Done

## Outputs
- `status` (string): Validation status (pass|blocked|conflict|clarification_required)
- `reasons` (array of strings, optional): Validation failure reasons
- `requiresReview` (boolean, optional): Whether review is required

## Steps

### Step 1: Validate Owner
- Check: `workstream.owner` is non-empty string
- Error: "Owner must be set"

### Step 2: Validate Scope
- Check: `workstream.scope` is non-empty array
- Error: "Scope must not be empty"

### Step 3: Validate Structural Model
- Check: `workstream.structuralModel` is non-empty string
- Error: "Structural Model must be present"

### Step 4: Validate Risks
- Check: `workstream.risks` is array
- If array is non-empty, validate each risk has: `id`, `description`, `impact`, `mitigation`
- Error: "Risks must be structured (can be empty array if no risks)"

### Step 5: Validate Layer
- Check: `workstream.layer` is one of: strategy, architecture, implementation, governance
- Error: "Layer must be one of: strategy, architecture, implementation, governance"

### Step 6: Validate Autonomy Tier
- Check: `workstream.autonomyTier` is 1, 2, 3, or 4
- Error: "Autonomy Tier must be 1, 2, 3, or 4"

### Step 7: Validate Definition of Done
- Check: `workstream.definitionOfDone` is non-empty string
- Error: "Definition of Done must be present"

### Step 8: Return Result
- If all validations pass: Return `{ status: "pass" }`
- If any validation fails: Return `{ status: "blocked", reasons: [...], requiresReview: true }`

## Tool Usage Rules
- This skill does not call any tools (pure validation)
- Uses `WorkstreamValidator` from `@agent-system/governance-v2` internally

## Validation & Success Criteria
- Success: All required fields present and valid, `status === "pass"`
- Failure: Any required field missing or invalid, `status === "blocked"` with reasons

## Logging Requirements
- Log skill execution: `action: "skill.executed", skillId: "governance.workstream_validate"`
- Log validation result in output

## Failure Modes & Retries
- No retries (validation is deterministic)
- If validation fails, return blocked status with reasons
- No side effects (read-only operation)
```

### 3. Example Skills

#### Example 1: governance.workstream_validate

**Manifest:** (see template above)

**Instructions:** (see template above)

**Implementation Plan:**
- Skill executor calls `WorkstreamValidator.validate(workstream)` from `@agent-system/governance-v2`
- No tool calls needed (pure validation)
- Returns validation result directly

#### Example 2: governance.doc_header_validate

**Manifest:**
```json
{
  "id": "governance.doc_header_validate",
  "name": "Document Header Validator",
  "version": "1.0.0",
  "description": "Validates markdown document headers for required governance fields (Version, Owner, Layer, Last Updated, DoD) and timestamp integrity",
  "tags": ["governance", "validation", "document"],
  "owners": ["@teamlead_orchestrator"],
  "layer": "governance",
  "autonomyTier": 2,
  "requiredPermissions": ["governance.read"],
  "requiredTools": [],
  "inputSchema": {
    "type": "object",
    "required": ["filePath"],
    "properties": {
      "filePath": { "type": "string" }
    }
  },
  "outputSchema": {
    "type": "object",
    "required": ["status"],
    "properties": {
      "status": { "type": "string", "enum": ["pass", "blocked"] },
      "reasons": { "type": "array", "items": { "type": "string" } }
    }
  },
  "sideEffects": [{"type": "read", "resource": "document", "scope": "global"}],
  "reviewPolicy": {"mode": "none"},
  "resources": {"instructions": "instructions.md"},
  "telemetry": {"trackExecution": true, "trackLatency": true, "trackErrors": true},
  "governance": {"generatesWorkstream": false, "requiresDocumentHeader": true, "timestampIntegrity": true}
}
```

**Implementation Plan:**
- Skill executor calls `DocumentHeaderValidator.validateDocument(filePath)` from `@agent-system/governance-v2`
- No tool calls needed (pure validation)
- Returns validation result

#### Example 3: runtime.time_gap_audit

**Manifest:**
```json
{
  "id": "runtime.time_gap_audit",
  "name": "Time Gap Audit",
  "version": "1.0.0",
  "description": "Audits runtime state for time gaps (≥50 min) and logs gap events",
  "tags": ["runtime", "audit", "time"],
  "owners": ["@teamlead_orchestrator"],
  "layer": "governance",
  "autonomyTier": 2,
  "requiredPermissions": ["governance.read"],
  "requiredTools": ["tool.logs.append"],
  "inputSchema": {
    "type": "object",
    "properties": {
      "thresholdMinutes": { "type": "integer", "default": 50 }
    }
  },
  "outputSchema": {
    "type": "object",
    "required": ["gaps"],
    "properties": {
      "gaps": { "type": "array", "items": { "type": "object" } }
    }
  },
  "sideEffects": [{"type": "read", "resource": "runtime_state", "scope": "global"}],
  "reviewPolicy": {"mode": "none"},
  "resources": {"instructions": "instructions.md"},
  "telemetry": {"trackExecution": true, "trackLatency": true, "trackErrors": true},
  "governance": {"generatesWorkstream": false}
}
```

**Implementation Plan:**
- Load runtime state via `loadState()` from `@agent-system/governance-v2`
- Calculate gap via `calculateGapMinutes()` using Clock
- If gap ≥ threshold, log via `tool.logs.append`
- Return gap audit results

#### Example 4: customer_data.read_safe

**Manifest:**
```json
{
  "id": "customer_data.read_safe",
  "name": "Safe Customer Data Read",
  "version": "1.0.0",
  "description": "Safely reads customer data with policy enforcement (authorize, sanitize, redact)",
  "tags": ["customer_data", "policy", "read"],
  "owners": ["@teamlead_orchestrator"],
  "layer": "implementation",
  "autonomyTier": 3,
  "requiredPermissions": ["customer_data.read"],
  "requiredTools": ["tool.customer_data.executeReadModel"],
  "customerDataAccess": {
    "enabled": true,
    "allowedOperations": ["executeReadModel"]
  },
  "inputSchema": {
    "type": "object",
    "required": ["clientId", "operationId"],
    "properties": {
      "clientId": { "type": "string" },
      "operationId": { "type": "string" },
      "params": { "type": "object" }
    }
  },
  "outputSchema": {
    "type": "object",
    "required": ["data", "metadata"],
    "properties": {
      "data": { "type": "array" },
      "metadata": { "type": "object" }
    }
  },
  "sideEffects": [{"type": "read", "resource": "customer_data", "scope": "client"}],
  "reviewPolicy": {"mode": "required", "reviewerRoles": ["reviewer_claude"]},
  "resources": {"instructions": "instructions.md"},
  "telemetry": {"trackExecution": true, "trackLatency": true, "trackErrors": true},
  "governance": {"generatesWorkstream": false}
}
```

**Implementation Plan:**
- Skill executor calls `tool.customer_data.executeReadModel` via ToolRouter
- ToolRouter enforces PolicyEngine (authorize, sanitize, redact) — existing flow
- Returns redacted data

#### Example 5: knowledge.search_project

**Manifest:**
```json
{
  "id": "knowledge.search_project",
  "name": "Project Knowledge Search",
  "version": "1.0.0",
  "description": "Searches project knowledge across decisions, reviews, and logs",
  "tags": ["knowledge", "search", "project"],
  "owners": ["@teamlead_orchestrator"],
  "layer": "implementation",
  "autonomyTier": 2,
  "requiredPermissions": ["knowledge.read"],
  "requiredTools": ["tool.knowledge.search"],
  "inputSchema": {
    "type": "object",
    "required": ["projectId", "query"],
    "properties": {
      "projectId": { "type": "string" },
      "query": { "type": "string", "minLength": 2 },
      "sources": { "type": "array", "items": { "type": "string" }, "default": ["decisions"] },
      "limit": { "type": "integer", "default": 10, "maximum": 25 }
    }
  },
  "outputSchema": {
    "type": "object",
    "required": ["results"],
    "properties": {
      "results": { "type": "array" }
    }
  },
  "sideEffects": [{"type": "read", "resource": "knowledge", "scope": "project"}],
  "reviewPolicy": {"mode": "none"},
  "resources": {"instructions": "instructions.md"},
  "telemetry": {"trackExecution": true, "trackLatency": true, "trackErrors": true},
  "governance": {"generatesWorkstream": false}
}
```

**Implementation Plan:**
- Skill executor calls `tool.knowledge.search` via ToolRouter
- ToolRouter calls `KnowledgeService.search()` — existing flow
- Returns search results

### 4. Skill Testing Template

```typescript
// packages/skills/__tests__/unit/skill-executor.test.ts

import { describe, it, expect } from '@jest/globals';
import { SkillExecutor } from '../src/executor/skill-executor';
import { FakeClock } from '@agent-system/governance-v2/runtime/clock';
import { SkillRegistry } from '../src/registry/skill-registry';
import type { ToolRouter } from '@agent-runtime/execution/tool-router';

describe('SkillExecutor', () => {
  let executor: SkillExecutor;
  let clock: FakeClock;
  let registry: SkillRegistry;
  let toolRouter: jest.Mocked<ToolRouter>;

  beforeEach(() => {
    clock = new FakeClock(new Date('2026-02-18T10:00:00.000Z'));
    registry = new SkillRegistry();
    toolRouter = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ToolRouter>;
    executor = new SkillExecutor(clock);
  });

  it('should compile skill plan from instructions', async () => {
    const manifest = await registry.getManifest('governance.workstream_validate');
    const instructions = await registry.loadInstructions('governance.workstream_validate');
    const input = {
      workstream: {
        owner: '@test',
        scope: ['packages/test/**'],
        structuralModel: 'test',
        risks: [],
        layer: 'implementation',
        autonomyTier: 2,
        definitionOfDone: 'test',
      },
    };

    const plan = await executor.compile(manifest!, instructions, input, {
      skillId: 'governance.workstream_validate',
      skillVersion: '1.0.0',
      agentProfile: {} as any,
      toolContext: { userId: 'user-1' },
      clock,
      input,
    });

    expect(plan.skillId).toBe('governance.workstream_validate');
    expect(plan.toolCalls).toEqual([]); // No tool calls for validation skill
    expect(plan.reviewRequired).toBe(false);
  });

  it('should execute skill plan via ToolRouter', async () => {
    // ... test execution
  });
});
```

```typescript
// packages/skills/__tests__/integration/orchestrator-integration.test.ts

import { describe, it, expect } from '@jest/globals';
import { Orchestrator } from '@agent-runtime/orchestrator/orchestrator';
import { SkillRegistry } from '../src/registry/skill-registry';
import { SkillExecutor } from '../src/executor/skill-executor';
import { FakeClock } from '@agent-system/governance-v2/runtime/clock';

describe('Orchestrator + Skill Integration', () => {
  it('should execute skill via Orchestrator', async () => {
    // Mock dependencies
    const clock = new FakeClock();
    const registry = new SkillRegistry();
    const executor = new SkillExecutor(clock);
    const orchestrator = new Orchestrator(
      { getById: jest.fn() },
      {} as any, // ToolRouter
      {} as any, // ReviewStore
      {} as any, // ActionLogger
      undefined, // GovernanceValidator
      clock
    );
    // Inject skill dependencies (requires Orchestrator constructor change)
    
    const result = await orchestrator.run(
      { userId: 'user-1' },
      {
        agentId: 'test-agent',
        userMessage: 'Validate workstream',
        skillId: 'governance.workstream_validate',
        skillInput: { workstream: { ... } },
      }
    );

    expect(result.status).toBe('ok');
  });
});
```

---

## D) Minimal Change Set

### Files to Create

| File | Purpose | Risk |
|------|---------|------|
| `packages/skills/package.json` | New package | None |
| `packages/skills/src/index.ts` | Public API | None |
| `packages/skills/src/spec/skill.types.ts` | TypeScript interfaces | None |
| `packages/skills/src/registry/skill-registry.ts` | Manifest loading | Low |
| `packages/skills/src/executor/skill-executor.ts` | Skill execution | Medium |
| `packages/skills/skills/**/manifest.json` | Skill manifests | None |
| `packages/skills/skills/**/instructions.md` | Skill instructions | None |

### Files to Modify

| File | Change | Risk | Rollback |
|------|--------|------|----------|
| `packages/agent-runtime/src/orchestrator/orchestrator.ts` | Add skill execution path (after gap detection) | Medium | Feature flag, revert commit |
| `packages/shared/src/types/agent.ts` | Add optional `skills?: string[]` to `AgentProfile` | Low | Optional field, backward compatible |
| `packages/agent-runtime/src/profiles/profile-loader.ts` | Update Zod schema to allow `skills` | Low | Optional field, backward compatible |
| `apps/api/src/modules/agents/agents.controller.ts` | Update `ExecuteDto` to allow skill fields | Low | Optional fields, backward compatible |
| `apps/api/src/modules/agents/agents.runtime.ts` | Create `SkillRegistry` and `SkillExecutor`, pass to `Orchestrator` | Low | Feature flag, conditional instantiation |
| `apps/web/src/app/(dashboard)/approval/page.tsx` | Display `skillId`/`version` if present | Low | UI change, non-breaking |
| `apps/web/src/app/(dashboard)/audit/page.tsx` | Display `skillId`/`version` if present | Low | UI change, non-breaking |

### Risk Summary

- **High Risk:** None
- **Medium Risk:** Orchestrator skill execution path (mitigated by feature flag)
- **Low Risk:** All other changes (backward compatible, opt-in)

### Rollback Strategy

1. **Feature Flag:** `ENABLE_SKILLS=false` disables skill execution path
2. **Git Revert:** All changes in separate commits, easy to revert
3. **Backward Compatibility:** Existing tool flow unchanged, skills are additive

---

**End of Blueprint**

