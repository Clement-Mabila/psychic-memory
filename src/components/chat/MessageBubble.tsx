'use client'
import { useState, useEffect } from 'react'
import { AlertTriangle, ChevronDown, ChevronRight, Brain } from 'lucide-react'
import { StreamingMessage } from './StreamingMessage'
import { ToolCallIndicator } from './ToolCallIndicator'
import type { ChatMessage, ToolCall } from '@/types/chat'

// ── Thinking phrase sets keyed by detected tool context ──────────────────────
const PHASE_PHRASES: Record<string, string[]> = {
  default:  ['Thinking', 'Thinking..', 'Processing', 'Processing..', 'Reasoning', 'Reasoning..'],
  search:   ['Searching', 'Searching..', 'Finding leads', 'Scanning..', 'Filtering..'],
  qualify:  ['Qualifying', 'Qualifying..', 'Scoring leads', 'Analyzing fit..', 'Evaluating..'],
  research: ['Researching', 'Researching..', 'Gathering intel', 'Reading sources..'],
  outreach: ['Drafting', 'Writing..', 'Personalizing..', 'Crafting message..'],
  pipeline: ['Analyzing', 'Crunching data..', 'Aggregating..', 'Calculating metrics..'],
  agent:    ['Iterating', 'Iterating..', 'Running agent..', 'Executing..'],
}

function getPhaseKey(toolCalls?: ToolCall[]): string {
  const name = (toolCalls?.[0]?.name ?? '').toLowerCase()
  if (name.includes('search') || name.includes('lead')) return 'search'
  if (name.includes('qualif'))                           return 'qualify'
  if (name.includes('research'))                         return 'research'
  if (name.includes('draft') || name.includes('outreach')) return 'outreach'
  if (name.includes('pipeline') || name.includes('stat'))  return 'pipeline'
  if (name.includes('agent') || name.includes('run'))      return 'agent'
  return 'default'
}

function ThinkingIndicator({ toolCalls }: { toolCalls?: ToolCall[] }) {
  const phaseKey = getPhaseKey(toolCalls)
  const phrases  = PHASE_PHRASES[phaseKey]
  const [idx, setIdx] = useState(0)

  useEffect(() => { setIdx(0) }, [phaseKey])
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % phrases.length), 1500)
    return () => clearInterval(t)
  }, [phrases.length])

  return (
    <div className="flex items-center gap-2.5 py-1">
      <div className="relative shrink-0 w-6 h-6">
        <div className="absolute inset-0 rounded-full bg-blue-400/40 blur-md animate-pulse scale-150" />
        <img src="/Logo.svg" alt="" className="relative w-6 h-6" />
      </div>
      <span className="text-sm text-slate-400 dark:text-neutral-500">{phrases[idx]}</span>
    </div>
  )
}

interface MessageBubbleProps {
  message: ChatMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser  = message.role === 'user'
  const isError = !!message.error
  const [reasoningOpen, setReasoningOpen] = useState(false)

  // ── User message: right-aligned pill, no avatar ───────────────────────────
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%] px-4 py-3 rounded-3xl bg-gray-100 dark:bg-neutral-700 text-gray-800 dark:text-white text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    )
  }

  // ── Assistant message: free text, no avatar, no bubble ───────────────────
  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Tool calls */}
      <ToolCallIndicator
        tool_calls={message.tool_calls}
        tool_results={message.tool_results}
        streaming={message.streaming}
      />

      {/* Thinking indicator */}
      {message.thinking && !message.content && (
        <ThinkingIndicator toolCalls={message.tool_calls} />
      )}

      {/* Qwen3 chain-of-thought — collapsible reasoning panel */}
      {message.thinking_content && (
        <div className="rounded-xl border border-violet-100 dark:border-violet-900/40 bg-violet-50/50 dark:bg-violet-950/20 overflow-hidden">
          <button
            onClick={() => setReasoningOpen(v => !v)}
            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
          >
            <Brain size={12} className="text-violet-400 dark:text-violet-500 shrink-0" />
            <span className="text-[11px] font-medium text-violet-500 dark:text-violet-400 flex-1">Reasoning</span>
            {reasoningOpen
              ? <ChevronDown  size={12} className="text-violet-400 dark:text-violet-500" />
              : <ChevronRight size={12} className="text-violet-400 dark:text-violet-500" />
            }
          </button>
          {reasoningOpen && (
            <div className="px-3 pb-3 pt-1 border-t border-violet-100 dark:border-violet-900/40">
              <pre className="text-[11px] text-slate-500 dark:text-neutral-400 whitespace-pre-wrap break-words font-mono leading-relaxed">
                {message.thinking_content}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Content — plain free text, no bubble */}
      {(message.content || (message.streaming && !message.thinking)) && (
        isError && !message.content ? (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertTriangle size={14} />
            <span>{message.error}</span>
          </div>
        ) : (
          <div className="text-sm text-slate-800 dark:text-neutral-100 leading-relaxed">
            <StreamingMessage content={message.content} done={!message.streaming} />
          </div>
        )
      )}

      {/* Inline error below partial content */}
      {isError && message.content && (
        <div className="flex items-center gap-1.5 text-xs text-red-500">
          <AlertTriangle size={11} />
          <span>{message.error}</span>
        </div>
      )}

    </div>
  )
}
