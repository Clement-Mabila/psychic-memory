'use client'
import { useRef, useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GenPhase } from './types'

function fmtElapsed(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function ThinkingPanel({
  thinking, phase, elapsed,
}: {
  thinking: string
  phase: GenPhase
  elapsed: number
}) {
  const scrollRef       = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [thinking])

  const streaming   = phase === 'thinking' || phase === 'content'
  const hasThinking = thinking.trim().length > 0

  useEffect(() => { if (streaming) setOpen(true) }, [streaming])

  if (!streaming && !hasThinking) return null

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 w-full text-left mb-1"
      >
        {streaming ? (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
          </span>
        ) : (
          <span className="h-2 w-2 shrink-0 rounded-full bg-stone-500" />
        )}
        <span className="text-[10px] font-medium text-stone-400 uppercase tracking-wider flex-1">
          {streaming
            ? (phase === 'thinking' ? 'Thinking…' : 'Writing…')
            : 'Model reasoning'}
          {elapsed > 0 && (
            <span className="ml-1.5 font-mono normal-case text-stone-500">{fmtElapsed(elapsed)}</span>
          )}
        </span>
        <ChevronDown className={cn('h-3 w-3 text-stone-500 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="bg-stone-900 dark:bg-neutral-950 rounded-xl border border-stone-700 dark:border-neutral-800 p-3">
          <div
            ref={scrollRef}
            className="h-36 overflow-y-auto scrollbar-none font-mono text-[10px] leading-relaxed text-stone-300 whitespace-pre-wrap"
          >
            {thinking || ' '}
            {phase === 'thinking' && (
              <span className="inline-block w-1.5 h-3 bg-blue-400 animate-pulse ml-0.5 align-middle" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
