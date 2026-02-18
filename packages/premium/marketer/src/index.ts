/**
 * Premium Marketer Module
 * 
 * Extension module for marketing narrative generation from KPIs.
 */

export { KPIParser } from "../utils/kpi-parser.js";
export { MarketerAgent } from "../agents/marketer-agent.js";
export { createMarketingTool } from "../tools/marketing-tool.js";
export type {
  KPIMetric,
  KPITrend,
  SemanticTranslation,
} from "../utils/kpi-parser.js";
export type {
  MarketerAgentInput,
  MarketerAgentOutput,
} from "../agents/marketer-agent.js";
export type {
  MarketingToolInput,
  MarketingToolOutput,
} from "../tools/marketing-tool.js";

