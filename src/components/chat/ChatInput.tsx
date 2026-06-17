'use client'
import { useState, useRef, useCallback } from 'react'
import { Send, Square } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FileUpload } from './FileUpload'

interface ChatInputProps {
  onSend: (message: string) => void
  onAbort?: () => void
  streaming?: boolean
  disabled?: boolean
}

export function ChatInput({ onSend, onAbort, streaming, disabled }: ChatInputProps) {
  const [value, setValue]     = useState('')
  const textareaRef           = useRef<HTMLTextAreaElement>(null)

  const submit = useCallback(() => {
    const text = value.trim()
    if (!text || streaming || disabled) return
    onSend(text)
    setValue('')
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, streaming, disabled, onSend])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value)
    // Auto-grow
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
  }

  return (
    <div className={cn(
      'flex items-end gap-2 px-3 py-2.5',
      'bg-white dark:bg-neutral-900',
      'border-t border-slate-100 dark:border-neutral-800',
    )}>
      <FileUpload disabled={streaming || disabled} />

      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Ask MBody Brain..."
          rows={1}
          disabled={disabled}
          className={cn(
            'w-full resize-none rounded-xl px-3.5 py-2.5 pr-10',
            'text-sm leading-relaxed',
            'bg-slate-50 dark:bg-neutral-800',
            'border border-slate-200 dark:border-neutral-700',
            'text-slate-800 dark:text-neutral-100',
            'placeholder:text-slate-400 dark:placeholder:text-neutral-500',
            'focus:outline-none focus:ring-2 focus:ring-violet-200 dark:focus:ring-violet-900/50',
            'transition-colors',
            'max-h-40 overflow-y-auto',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        />
      </div>

      {/* Send / Stop button */}
      {streaming ? (
        <button
          onClick={onAbort}
          title="Stop generation"
          className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
        >
          <Square size={14} className="fill-current" />
        </button>
      ) : (
        <button
          onClick={submit}
          disabled={!value.trim() || disabled}
          title="Send (Enter)"
          className={cn(
            'shrink-0 w-8 h-8 flex items-center justify-center rounded-lg transition-colors',
            value.trim() && !disabled
              ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-neutral-600 cursor-not-allowed',
          )}
        >
          <Send size={14} />
        </button>
      )}
    </div>
  )
}
