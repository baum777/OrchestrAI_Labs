# Skill: governance.doc_header_validate

## Purpose
Validates markdown document headers for required governance fields and timestamp integrity.

## When to Use
- Before committing governance documents
- In CI/CD pipelines for document validation
- As a preflight check for document updates

## Inputs
- `filePath` (string, required): Path to markdown file to validate

## Outputs
- `status` (string): Validation status (pass|blocked)
- `reasons` (array of strings, optional): Validation failure reasons

## Steps

### Step 1: Validate File Exists
- Check: File exists at `filePath`
- Error: "Document file does not exist"

### Step 2: Parse Document Header
- Read first 30 lines of file
- Extract header fields: Version, Owner, Layer, Last Updated, Definition of Done, Erstellt, Aktualisiert

### Step 3: Validate Required Fields
- Check: Version is present and non-empty
- Check: Owner is present and non-empty
- Check: Layer is present and valid (strategy|architecture|implementation|governance)
- Check: Last Updated is present and non-empty
- Check: Definition of Done is present and non-empty
- Error: "missing_header_version", "missing_owner", "missing_layer_tag", "missing_last_updated", "missing_dod"

### Step 4: Validate Timestamp Format
- Parse Last Updated as ISO-8601 timestamp
- Check: Timestamp is valid
- Check: Timestamp is not >5 minutes in future (max skew)
- Error: "invalid_last_updated_format", "last_updated_in_future"

### Step 5: Validate Timestamp Integrity
- If Erstellt and Aktualisiert present:
  - Check: `updatedAt >= createdAt`
  - If violation: Self-heal by setting `updatedAt = createdAt`
  - Error: "timestamp_integrity_violation"
- Emit timestamp correction event if self-healing occurred

### Step 6: Return Result
- If all validations pass: Return `{ status: "pass" }`
- If any validation fails: Return `{ status: "blocked", reasons: [...] }`

## Tool Usage Rules
- This skill does not call any tools (pure validation)
- Uses `DocumentHeaderValidator` from `@agent-system/governance-v2` internally
- Uses `validateTimestampIntegrity` from `@agent-system/shared` for timestamp checks

## Validation & Success Criteria
- Success: All required fields present, valid format, timestamp integrity maintained, `status === "pass"`
- Failure: Any validation fails, `status === "blocked"` with reasons

## Logging Requirements
- Log skill execution: `action: "skill.executed", skillId: "governance.doc_header_validate"`
- Log timestamp correction events if self-healing occurred

## Failure Modes & Retries
- No retries (validation is deterministic)
- If validation fails, return blocked status with reasons
- Self-healing for timestamp integrity violations (logs correction event)
- No side effects (read-only operation, except timestamp correction logging)

