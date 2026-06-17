'use client'
import { useState, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import {
  HelpCircle, Bell, LibraryBig, X,
  Users, CheckCircle2, Search, MessageSquare, BarChart3, Zap,
  Paperclip, RotateCcw, SendHorizonal, Square, Mic,
  MessageCircle, Trash2, PlusCircle,
  UserSearch, Star, SearchCode, Mail, TrendingUp, Bot,
} from 'lucide-react'
import { listSessions, closeSession } from '@/lib/chatApi'
import { useChat } from '@/hooks/useChat'
import { MessageList } from './MessageList'
import { ConfirmationModal } from './ConfirmationModal'
import type { ChatSession } from '@/types/chat'

// ── Feature cards (welcome screen) ───────────────────────────────────────────
const FEATURE_CARDS = [
  { icon: Users,         bg: 'bg-blue-50',   color: 'text-blue-500',   title: 'Find Leads',     desc: 'Discover and surface new prospects from your pipeline',   prompt: 'Show me the top leads in my pipeline'                    },
  { icon: CheckCircle2,  bg: 'bg-violet-50', color: 'text-violet-500', title: 'Qualify Lead',   desc: 'Score and analyze lead quality and fit',                  prompt: 'Qualify the leads in my pipeline and rank them by score' },
  { icon: Search,        bg: 'bg-sky-50',    color: 'text-sky-500',    title: 'Research',       desc: 'Deep intel on a company or contact',                      prompt: 'Research the top company in my leads'                    },
  { icon: MessageSquare, bg: 'bg-orange-50', color: 'text-orange-500', title: 'Draft Outreach', desc: 'Write personalised emails and messages',                  prompt: 'Draft an outreach email for my top lead'                 },
  { icon: BarChart3,     bg: 'bg-amber-50',  color: 'text-amber-500',  title: 'Pipeline Stats', desc: 'Analyse pipeline health and conversion data',             prompt: 'Give me a summary of my current pipeline health'         },
  { icon: Zap,           bg: 'bg-rose-50',   color: 'text-rose-500',   title: 'Run Agent',      desc: 'Trigger an AI pipeline agent task',                       prompt: 'Which agent should I run next on my pipeline?'           },
]

/*
 * Inline hex values for tool icon bg + color — avoids Tailwind JIT purge
 * of dynamically-referenced class strings (e.g. tool.color).
 */
const BASIC_TOOLS = [
  { icon: UserSearch, name: 'Lead Search',       desc: 'Find and filter leads by company, title, or pipeline stage'         },
  { icon: Star,       name: 'Qualification',     desc: 'Score and rank lead intent, fit, and conversion likelihood'          },
  { icon: SearchCode, name: 'Pipeline Overview', desc: 'Summarise your pipeline stages, volumes, and health metrics'         },
  { icon: Mail,       name: 'Outreach Draft',    desc: 'Generate personalised outreach emails and follow-up sequences'       },
]
const ADVANCED_TOOLS = [
  { icon: TrendingUp, name: 'Analytics',         desc: 'Data-driven insights on conversion trends and pipeline velocity'     },
  { icon: Bot,        name: 'Agent Control',     desc: 'Trigger, pause, and monitor AI pipeline agents in real time'         },
]

// ── Component ─────────────────────────────────────────────────────────────────
export function ChatPage() {
  const {
    messages, streaming,
    pendingAction, sendMessage, loadSession,
    clearMessages, dismissAction, abort,
  } = useChat()

  const [selected,    setSelected]    = useState<string | null>(null)
  const [panelOpen,   setPanelOpen]   = useState(true)
  const [panelTab,    setPanelTab]    = useState<'tools' | 'history'>('tools')
  const [inputValue,  setInputValue]  = useState('')
  const [infoVisible, setInfoVisible] = useState(true)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: sessions = [], refetch } = useQuery<ChatSession[]>({
    queryKey: ['chat-sessions'],
    queryFn:  listSessions,
    staleTime: 10_000,
  })

  const hasMessages = messages.length > 0

  const MODEL_LABELS: Record<string, string> = {
    'mbody-critic-qwen3':        'Qwen3-30B',
    'claude-haiku-4-5-20251001': 'Haiku 4.5',
    'llm_30b':                   'Qwen3-30B',
  }
  const lastMsg      = [...messages].reverse().find(m => m.role === 'assistant' && m.model_used)
  const modelLabel   = lastMsg?.model_used ? (MODEL_LABELS[lastMsg.model_used] ?? lastMsg.model_used) : 'Qwen3-30B'
  const latencyLabel = lastMsg?.latency_ms ? `${lastMsg.latency_ms}ms` : null

  const handleCardClick = useCallback((prompt: string) => {
    setInputValue(prompt)
    textareaRef.current?.focus()
  }, [])

  const handleSubmit = useCallback(() => {
    const text = inputValue.trim()
    if (!text || streaming) return
    sendMessage(text)
    setInputValue('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }, [inputValue, streaming, sendMessage])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }, [handleSubmit])

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
  }, [])

  const selectSession = useCallback(async (id: string) => {
    setSelected(id)
    await loadSession(id)
  }, [loadSession])

  const newConversation = useCallback(() => {
    clearMessages()
    setSelected(null)
  }, [clearMessages])

  const deleteSession = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await closeSession(id)
    refetch()
    if (selected === id) newConversation()
  }, [selected, newConversation, refetch])

  return (
    /* Outer row: p-3 gap-3 puts 12px gap from all viewport edges and between columns */
    <div className="flex h-full overflow-hidden bg-slate-50 dark:bg-neutral-900 p-3 gap-3">

      {/* ── Left column: header (on slate-50) stacked above the main floating card ── */}
      <div className="flex-1 flex flex-col gap-3 min-h-0 min-w-0">

        {/* Header sits flat on slate-50, icons naturally end before the right panel */}
        <div className="flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Chat With AI</h1>
            <p className="text-xs text-gray-400 dark:text-neutral-500 mt-0.5">
              Ask about leads, pipeline health, outreach and more
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-900 dark:bg-neutral-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-xs font-medium text-white dark:text-gray-900 whitespace-nowrap">
                Lyra · Qwen3-30B
              </span>
            </div>
            <button className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-white dark:hover:bg-neutral-800 transition-colors">
              <HelpCircle size={16} strokeWidth={1.5} />
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-white dark:hover:bg-neutral-800 transition-colors">
              <Bell size={16} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => setPanelOpen(o => !o)}
              className={cn(
                'w-8 h-8 flex items-center justify-center rounded-full transition-colors',
                panelOpen
                  ? 'bg-gray-900 dark:bg-neutral-100 text-white dark:text-gray-900'
                  : 'text-gray-500 hover:bg-white dark:hover:bg-neutral-800',
              )}
            >
              <LibraryBig size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* ── Main floating card ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col bg-white dark:bg-neutral-950 rounded-2xl shadow-sm overflow-hidden min-w-0">

          {!hasMessages ? (
            /* Scrollable outer — overflow-y-auto without justify-center so top is never clipped */
            <div className="flex-1 overflow-y-auto px-6">
              {/* Inner wrapper centers content when there's room, grows naturally when content is tall */}
              <div className="flex flex-col items-center justify-center min-h-full py-10">
                {/* Planet icon */}
                <div className="relative mb-5">
                  <div className="absolute inset-0 rounded-full bg-blue-400/25 blur-2xl scale-[2]" />
                  <img src="/ai.svg" alt="Lyra" className="relative w-16 h-16 drop-shadow-md" />
                </div>

                <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center tracking-tight">
                  Welcome to Construct Lyra
                </h2>
                <p className="text-sm text-gray-400 dark:text-neutral-500 text-center mt-2.5 max-w-sm leading-relaxed">
                  Your MBody Brain model for lead intelligence. Ask about prospects,
                  pipeline health, or outreach — Lyra knows it all.
                </p>

                {/* 3 × 2 feature cards */}
                <div className="grid grid-cols-3 gap-3 mt-8 w-full max-w-xl">
                  {FEATURE_CARDS.map(card => {
                    const Icon = card.icon
                    return (
                      <button
                        key={card.title}
                        onClick={() => handleCardClick(card.prompt)}
                        className="rounded-2xl border border-gray-100 dark:border-neutral-800 p-4 text-left hover:border-gray-200 dark:hover:border-neutral-700 hover:shadow-sm transition-all bg-white dark:bg-neutral-900 cursor-pointer"
                      >
                        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', card.bg)}>
                          <Icon size={17} className={card.color} strokeWidth={1.75} />
                        </div>
                        <p className="text-sm font-medium text-gray-800 dark:text-neutral-100 leading-snug">{card.title}</p>
                        <p className="text-xs text-gray-400 dark:text-neutral-500 mt-1 leading-relaxed">{card.desc}</p>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <MessageList messages={messages} />
          )}

          {/* Input pinned to bottom of white card — aligned to same max-w-2xl column as messages */}
          <div className="shrink-0 px-6 pb-6">
            <div className="max-w-2xl mx-auto">
            {infoVisible && !hasMessages && (
              <div className="flex items-center gap-2 mb-3 px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-100">
                <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" viewBox="0 0 16 16" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M8 15A7 7 0 108 1a7 7 0 000 14zm.75-10a.75.75 0 00-1.5 0v.5a.75.75 0 001.5 0V5zm0 3a.75.75 0 00-1.5 0v4a.75.75 0 001.5 0V8z" />
                </svg>
                <span className="flex-1 text-xs text-blue-600">
                  Select a feature above or type your question — Lyra routes it to the right tools automatically.
                </span>
                <button onClick={() => setInfoVisible(false)} className="text-blue-300 hover:text-blue-500 transition-colors">
                  <X size={13} />
                </button>
              </div>
            )}

            <div className="rounded-2xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-sm">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder="Write your message…"
                rows={1}
                className="w-full resize-none px-4 pt-4 pb-2 text-sm text-gray-800 dark:text-neutral-100 placeholder:text-gray-400 dark:placeholder:text-neutral-500 bg-transparent outline-none max-h-40 overflow-y-auto leading-relaxed"
              />
              <div className="flex items-center justify-between px-3 pb-3">
                {/* Left: attach + clear */}
                <div className="flex items-center gap-1">
                  <button className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors">
                    <Paperclip size={14} strokeWidth={1.75} />
                  </button>
                  <button
                    onClick={() => { setInputValue(''); if (textareaRef.current) textareaRef.current.style.height = 'auto' }}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <RotateCcw size={14} strokeWidth={1.75} />
                  </button>
                </div>
                {/* Right: model label · latency, mic, send/stop */}
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-neutral-500 select-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    {modelLabel}
                    {latencyLabel && <span className="opacity-60">{latencyLabel}</span>}
                  </span>
                  <button className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors">
                    <Mic size={14} strokeWidth={1.75} />
                  </button>
                  {streaming ? (
                    <button onClick={abort} className="w-8 h-8 flex items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow-sm">
                      <Square size={12} className="fill-current" />
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={!inputValue.trim()}
                      className={cn(
                        'w-8 h-8 flex items-center justify-center rounded-full transition-colors',
                        inputValue.trim()
                          ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-neutral-800 text-gray-300 dark:text-neutral-600 cursor-not-allowed',
                      )}
                    >
                      <SendHorizonal size={14} strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>
            </div>
            </div>{/* end max-w-2xl */}
          </div>
        </div>
      </div>{/* end left column */}

      {/* ── Right floating panel — sibling to left column, fills full outer-row height ── */}
      {panelOpen && (
        <div className="w-72 shrink-0 flex flex-col bg-white dark:bg-neutral-950 rounded-2xl shadow-sm overflow-hidden">

            {/* Panel header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3">
              <div className="flex items-center gap-2">
                <LibraryBig size={15} className="text-slate-500" strokeWidth={1.75} />
                <span className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">Tools</span>
              </div>
              <button
                onClick={() => setPanelOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 transition-colors"
              >
                <X size={14} strokeWidth={1.75} />
              </button>
            </div>

            {/* ── Pill switcher — centered, in middle of the panel ── */}
            <div className="flex justify-center px-4 pb-3">
              <div className="flex bg-gray-100 dark:bg-neutral-800 rounded-full p-0.5 w-full">
                <button
                  onClick={() => setPanelTab('tools')}
                  className={cn(
                    'flex-1 py-1.5 rounded-full text-xs font-medium transition-all',
                    panelTab === 'tools'
                      ? 'bg-white dark:bg-neutral-900 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-400 dark:text-neutral-500 hover:text-gray-600',
                  )}
                >
                  Tools
                </button>
                <button
                  onClick={() => setPanelTab('history')}
                  className={cn(
                    'flex-1 py-1.5 rounded-full text-xs font-medium transition-all',
                    panelTab === 'history'
                      ? 'bg-white dark:bg-neutral-900 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-400 dark:text-neutral-500 hover:text-gray-600',
                  )}
                >
                  History
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-100 dark:bg-neutral-800 mx-4" />

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {panelTab === 'tools' ? (
                <div className="p-4">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-3">Basic Tools</p>
                  <div className="space-y-1">
                    {BASIC_TOOLS.map(tool => {
                      const Icon = tool.icon
                      return (
                        <div key={tool.name} className="flex items-start gap-3 py-2">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-gray-100 dark:bg-neutral-800">
                            <Icon size={14} strokeWidth={1.75} className="text-gray-500 dark:text-neutral-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-neutral-100 leading-snug">{tool.name}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{tool.desc}</p>
                          </div>
                          <div className="shrink-0 w-9 h-5 rounded-full bg-gray-200 dark:bg-neutral-700 mt-1.5" />
                        </div>
                      )
                    })}
                  </div>

                  <p className="text-[10px] uppercase tracking-wider text-gray-400 mt-5 mb-3">Advanced Tools</p>
                  <div className="space-y-1">
                    {ADVANCED_TOOLS.map(tool => {
                      const Icon = tool.icon
                      return (
                        <div key={tool.name} className="flex items-start gap-3 py-2">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 bg-gray-100 dark:bg-neutral-800">
                            <Icon size={14} strokeWidth={1.75} className="text-gray-500 dark:text-neutral-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 dark:text-neutral-100 leading-snug">{tool.name}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{tool.desc}</p>
                          </div>
                          <div className="shrink-0 w-9 h-5 rounded-full bg-gray-200 dark:bg-neutral-700 mt-1.5" />
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                /* History tab */
                <div className="p-3 space-y-1">
                  <button
                    onClick={newConversation}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-500 dark:text-neutral-400 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <PlusCircle size={14} strokeWidth={1.75} />
                    New chat
                  </button>

                  <p className="text-[10px] uppercase tracking-wider text-gray-400 px-3 pt-3 pb-1">Recent</p>

                  {sessions.length === 0 && (
                    <p className="text-xs text-gray-400 px-3 py-2">No sessions yet</p>
                  )}

                  {sessions.map(s => (
                    <div
                      key={s.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => selectSession(s.id)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') selectSession(s.id) }}
                      className={cn(
                        'group flex items-start justify-between gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-colors',
                        selected === s.id ? 'bg-gray-100' : 'hover:bg-gray-50',
                      )}
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        <p className="text-xs text-gray-700 dark:text-neutral-300 truncate">{s.title}</p>
                      </div>
                      <button
                        onClick={e => deleteSession(s.id, e)}
                        className="opacity-0 group-hover:opacity-100 shrink-0 text-gray-300 hover:text-red-500 transition-all"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
      )}

      {/* Confirmation modal */}
      {pendingAction && (
        <ConfirmationModal
          action={pendingAction}
          onSuccess={() => dismissAction()}
          onDismiss={dismissAction}
        />
      )}
    </div>
  )
}
