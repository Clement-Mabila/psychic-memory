export type ChatRole = 'user' | 'assistant' | 'tool'

export interface ToolCall {
  name: string
  args: Record<string, unknown>
}

export interface ToolResult {
  name: string
  count?: number
  error?: string
}

export interface PendingAction {
  action_id: string
  action_type: string
  required_text: string
  description: string
}

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  model_used?: string
  intent?: string
  tool_calls?: ToolCall[]
  tool_results?: ToolResult[]
  latency_ms?: number
  cost_usd?: number
  fallback?: boolean
  created?: string
  // streaming-only
  streaming?: boolean
  thinking?: boolean            // true between sse_thinking and first token
  thinking_content?: string     // Qwen3 chain-of-thought text (collapsible in UI)
  pending_action?: PendingAction
  error?: string
}

export interface ChatSession {
  id: string
  title: string
  cost_usd: number
  created: string
  modified: string
}

export interface SSEDonePayload {
  model: string
  latency_ms: number
  intent: string
  cost_usd: number
  fallback: boolean
}
