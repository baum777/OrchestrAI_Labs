# Skill: knowledge.search_project

## Purpose
Searches project knowledge across decisions, reviews, and logs via existing knowledge search tool.

## When to Use
- When agent needs to search project knowledge
- In workflows requiring knowledge retrieval
- As part of research or analysis tasks

## Inputs
- `projectId` (string, required): Project identifier
- `query` (string, required): Search query (min 2 characters)
- `sources` (array, optional): Sources to search (default: ["decisions"])
  - Valid values: "decisions", "reviews", "logs"
- `limit` (integer, optional): Maximum results (default: 10, max: 25)

## Outputs
- `results` (array): Search results
  - `id` (string): Result identifier
  - `title` (string): Result title
  - `source` (string): Source type (decisions|reviews|logs)
  - `snippet` (string): Result snippet

## Steps

### Step 1: Validate Input
- Check: `projectId` is present and non-empty
- Check: `query` is present and length ≥ 2
- Error: "projectId is required", "q is required and must be at least 2 characters"

### Step 2: Validate Sources
- If `sources` provided: Validate all values are in ["decisions", "reviews", "logs"]
- If invalid: Error "sources must be one or more of: decisions, reviews, logs"
- If not provided: Default to ["decisions"]

### Step 3: Validate Limit
- If `limit` provided: Validate 1 ≤ limit ≤ 25
- If not provided: Default to 10

### Step 4: Call Knowledge Search Tool
- Call: `tool.knowledge.search` via ToolRouter with:
  - `projectId`: From input
  - `q`: From input
  - `sources`: From input (validated)
  - `limit`: From input (validated)
- ToolRouter will:
  1. Call KnowledgeService.search()
  2. Query PostgreSQL tables (decisions, reviews, action_logs)
  3. ActionLogger.append() → Log search (audit requirement)

### Step 5: Return Results
- If tool call succeeds: Return `{ results: result.output }`
- If tool call fails: Return error from tool

## Tool Usage Rules
- Must call `tool.knowledge.search` (no direct KnowledgeService calls)
- ActionLogger is required (audit requirement, tool enforces this)

## Validation & Success Criteria
- Success: Tool call succeeds, results returned, `results` array present
- Failure: Tool call fails, return error from tool

## Logging Requirements
- Log skill execution: `action: "skill.executed", skillId: "knowledge.search_project"`
- Tool call logs via `tool.knowledge.search` (ActionLogger.append with `action: "knowledge.search"`)

## Failure Modes & Retries
- Validation failure: Return error immediately (no retries)
- Tool call failure: Return error from tool (no retries)
- No retries (search is deterministic, no side effects on failure)

