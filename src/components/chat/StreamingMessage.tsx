'use client'
import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StreamingMessageProps {
  content: string
  done?: boolean
  className?: string
}

export function StreamingMessage({ content, done, className }: StreamingMessageProps) {
  const cursorRef = useRef<HTMLSpanElement>(null)

  return (
    <div className={cn('text-sm leading-relaxed whitespace-pre-wrap break-words', className)}>
      {renderMarkdown(content)}
      {!done && (
        <span
          ref={cursorRef}
          className="inline-block w-0.5 h-4 bg-current align-middle ml-0.5 animate-pulse"
        />
      )}
    </div>
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  const lines = text.split('\n')
  const output: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Fenced code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      output.push(
        <pre key={i} className="my-2 p-3 rounded-lg bg-neutral-900 dark:bg-black text-emerald-300 text-xs overflow-x-auto font-mono">
          <code>{codeLines.join('\n')}</code>
        </pre>
      )
      i++
      continue
    }

    // Heading
    if (line.startsWith('### ')) {
      output.push(<h3 key={i} className="font-semibold text-sm mt-3 mb-1 text-slate-800 dark:text-neutral-100">{inlineFormat(line.slice(4))}</h3>)
    } else if (line.startsWith('## ')) {
      output.push(<h2 key={i} className="font-bold text-sm mt-4 mb-1 text-slate-900 dark:text-neutral-50">{inlineFormat(line.slice(3))}</h2>)
    } else if (line.startsWith('# ')) {
      output.push(<h1 key={i} className="font-bold text-base mt-4 mb-2 text-slate-900 dark:text-neutral-50">{inlineFormat(line.slice(2))}</h1>)
    }
    // List item
    else if (/^[-*] /.test(line)) {
      output.push(<li key={i} className="ml-4 list-disc">{inlineFormat(line.slice(2))}</li>)
    }
    // Numbered list
    else if (/^\d+\. /.test(line)) {
      output.push(<li key={i} className="ml-4 list-decimal">{inlineFormat(line.replace(/^\d+\. /, ''))}</li>)
    }
    // Horizontal rule
    else if (/^---+$/.test(line.trim())) {
      output.push(<hr key={i} className="my-2 border-slate-200 dark:border-neutral-700" />)
    }
    // Empty line
    else if (!line.trim()) {
      output.push(<br key={i} />)
    }
    // Normal paragraph
    else {
      output.push(<span key={i}>{inlineFormat(line)}<br /></span>)
    }
    i++
  }
  return <>{output}</>
}

function inlineFormat(text: string): React.ReactNode {
  // Bold + italic + code
  const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\*[^*]+\*|_[^_]+_)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') || part.startsWith('__')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`')) {
      return <code key={i} className="px-1 py-0.5 rounded bg-slate-100 dark:bg-neutral-700 text-xs font-mono">{part.slice(1, -1)}</code>
    }
    if (part.startsWith('*') || part.startsWith('_')) {
      return <span key={i}>{part.slice(1, -1)}</span>
    }
    return part
  })
}
