'use client'
import { useState, useEffect, useRef } from 'react'
import { AlertTriangle, ChevronDown } from 'lucide-react'
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

// ── Combined thinking section — Claude-style collapsible ─────────────────────
function ThinkingSection({
  active,
  content,
  toolCalls,
}: {
  active: boolean
  content?: string
  toolCalls?: ToolCall[]
}) {
  const [open, setOpen]   = useState(false)
  const phaseKey          = getPhaseKey(toolCalls)
  const phrases           = PHASE_PHRASES[phaseKey]
  const [idx, setIdx]     = useState(0)
  const scrollRef         = useRef<HTMLDivElement>(null)

  useEffect(() => { setIdx(0) }, [phaseKey])

  // Cycle phrases while thinking
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setIdx(i => (i + 1) % phrases.length), 1500)
    return () => clearInterval(t)
  }, [active, phrases.length])

  // Auto-open when thinking starts so user sees the panel immediately
  useEffect(() => { if (active) setOpen(true) }, [active])

  // Auto-scroll reasoning content as it grows
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [content])

  const label = active ? phrases[idx] : 'Thought'

  return (
    <div>
      {/* Header — same visual language as existing ThinkingIndicator */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 py-0.5 group"
      >
        <div className="relative shrink-0 w-5 h-5">
          {active && (
            <div className="absolute inset-0 rounded-full bg-blue-400/40 blur-md animate-pulse scale-150" />
          )}
          <img src="/Logo.svg" alt="" className="relative w-5 h-5" />
        </div>
        <span className="text-sm text-slate-400 dark:text-neutral-500">{label}</span>
        <ChevronDown
          size={12}
          className={`text-slate-300 dark:text-neutral-600 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Reasoning body */}
      {open && (
        <div className="mt-1.5 rounded-xl bg-stone-50 dark:bg-neutral-900 border border-stone-100 dark:border-neutral-800 p-3">
          {content ? (
            <div
              ref={scrollRef}
              className="max-h-52 overflow-y-auto scrollbar-none font-mono text-[11px] text-slate-400 dark:text-neutral-500 leading-relaxed whitespace-pre-wrap break-words"
            >
              {content}
              {active && (
                <span className="inline-block w-1.5 h-3 bg-blue-400 animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          ) : (
            <p className="font-mono text-[11px] text-slate-300 dark:text-neutral-600">
              {active ? 'Reasoning…' : '—'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

interface MessageBubbleProps {
  message: ChatMessage
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser  = message.role === 'user'
  const isError = !!message.error

  // ── User message: right-aligned pill ─────────────────────────────────────
  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[70%] px-4 py-3 rounded-3xl bg-gray-100 dark:bg-neutral-700 text-gray-800 dark:text-white text-sm leading-relaxed whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    )
  }

  // ── Assistant message: free text, no bubble ───────────────────────────────
  return (
    <div className="flex flex-col gap-2 w-full">
      {/* Tool calls */}
      <ToolCallIndicator
        tool_calls={message.tool_calls}
        tool_results={message.tool_results}
        streaming={message.streaming}
      />

      {/* Thinking — single collapsible section for both active and done states */}
      {(message.thinking || message.thinking_content) && (
        <ThinkingSection
          active={!!message.thinking}
          content={message.thinking_content}
          toolCalls={message.tool_calls}
        />
      )}

      {/* Content */}
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
