# Skill: customer_data.read_safe

## Purpose
Safely reads customer data with policy enforcement (authorize, sanitize, redact) via existing customer data tools.

## When to Use
- When agent needs to read customer data with policy enforcement
- As a safe wrapper around customer data access
- In workflows requiring audited customer data access

## Inputs
- `clientId` (string, required): Client identifier
- `operationId` (string, required): Operation identifier (e.g., "getCustomers")
- `params` (object, optional): Operation parameters

## Outputs
- `data` (array): Redacted data array
- `metadata` (object): Execution metadata
  - `rowCount` (integer): Number of rows returned
  - `fieldsReturned` (array): Fields returned
  - `latencyMs` (integer): Execution latency
  - `sourceType` (string): Data source type
  - `resultHash` (string): Deterministic result hash
  - `policyDecisionHash` (string): Policy decision hash

## Steps

### Step 1: Validate Input
- Check: `clientId` is present and non-empty
- Check: `operationId` is present and non-empty
- Error: "clientId is required", "operationId is required"

### Step 2: Call Customer Data Tool
- Call: `tool.customer_data.executeReadModel` via ToolRouter with:
  - `clientId`: From input
  - `operationId`: From input
  - `params`: From input (if provided)
- ToolRouter will:
  1. PolicyEngine.authorize() → Check permissions, clientId scoping, cross-tenant protection
  2. CapabilityRegistry.getCapabilities() → Get capability map
  3. CapabilityRegistry.isOperationAllowed() → Check allowlist
  4. PolicyEngine.sanitize() → Reject raw SQL, apply constraints
  5. ConnectorRegistry.getConnector() → Get connector
  6. connector.executeReadModel() → Execute read operation
  7. PolicyEngine.redact() → Remove denyFields, filter to allowedFields
  8. generateResultHash() → Generate deterministic hash
  9. ActionLogger.append() → Log access with decisionHash and resultHash

### Step 3: Handle Result
- If tool call succeeds: Return `{ data: result.data, metadata: result.metadata }`
- If tool call fails: Return error from tool

## Tool Usage Rules
- Must call `tool.customer_data.executeReadModel` (no direct PolicyEngine calls)
- ToolRouter enforces all policy gates (authorize, sanitize, redact)
- Review gate handled by Orchestrator (skill has `reviewPolicy.mode: "required"`)

## Validation & Success Criteria
- Success: Tool call succeeds, data returned, `data` and `metadata` present
- Failure: Tool call fails, return error from tool

## Logging Requirements
- Log skill execution: `action: "skill.executed", skillId: "customer_data.read_safe"`
- Tool call logs via `tool.customer_data.executeReadModel` (ActionLogger.append with `action: "customer_data.access"`)

## Failure Modes & Retries
- Policy violation: ToolRouter throws PolicyError, return error (no retries)
- Connector failure: Return error from connector (no retries)
- Audit log failure: ToolRouter blocks operation (audit log is required)
- No retries (customer data access is deterministic, no side effects on failure)

