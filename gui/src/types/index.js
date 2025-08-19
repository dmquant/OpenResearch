// Workflow States
export const WORKFLOW_PHASES = {
  TOPIC_INPUT: 'topic_input',
  PLANNING: 'planning',
  PLAN_CONFIRMATION: 'plan_confirmation',
  EXECUTION: 'execution',
  SYNTHESIS: 'synthesis',
  COMPOSITION: 'composition',
  COMPLETE: 'complete'
}

// Task Types
export const TASK_TYPES = {
  LITERATURE_REVIEW: 'literature_review',
  CURRENT_DATA: 'current_data',
  EXPERT_ANALYSIS: 'expert_analysis',
  COMPARATIVE_STUDY: 'comparative_study',
  WEB_SEARCH: 'web_search',
  RAG_QUERY: 'rag_query',
  MCP_DATA: 'mcp_data'
}

// Card Types
export const CARD_TYPES = {
  TEXT_SUMMARY: 'text_summary',
  CHART: 'chart',
  TABLE: 'table',
  QUOTE: 'quote',
  IMAGE: 'image'
}

// Agent Types
export const AGENT_TYPES = {
  WEB: 'web',
  RAG: 'rag',
  MCP: 'mcp'
}