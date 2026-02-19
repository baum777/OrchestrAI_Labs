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

