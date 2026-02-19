# Skill: your.namespace.skill_id

## Purpose
Clear statement of what this skill accomplishes and why it exists.

## When to Use
- Scenario 1: When you need to...
- Scenario 2: When you want to...

## Inputs
- `field1` (type, required/optional): Description
  - Constraints or validation rules
- `field2` (type, optional): Description

## Outputs
- `status` (string, required): Success or error status
- `data` (object, optional): Result data

## Steps

### Step 1: Validation
- Check: Input validation rules
- Error: Error message if validation fails

### Step 2: Tool Call
- Call: `tool.name` with parameters
- Expected result: Description

### Step 3: Processing
- Process tool result
- Transform data if needed

### Step 4: Return Result
- Success: Return `{ status: "ok", data: {...} }`
- Failure: Return `{ status: "error", error: "message" }`

## Tool Usage Rules
- List any constraints on tool usage
- Note if tools must be called in specific order
- Document any tool call dependencies

## Validation & Success Criteria
- Success: All criteria met, `status === "ok"`
- Failure: Any criterion not met, `status === "error"` with error message

## Logging Requirements
- Log skill execution: `action: "skill.executed", skillId: "your.namespace.skill_id"`
- Log any important intermediate steps
- Include telemetry if `telemetry.trackExecution === true`

## Failure Modes & Retries
- Failure mode 1: Description, retry strategy (if any)
- Failure mode 2: Description, no retries (if deterministic)
- Document side effects (if any)

