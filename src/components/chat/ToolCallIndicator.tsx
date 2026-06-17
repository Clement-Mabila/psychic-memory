'use client'
import { useState } from 'react'
import { Terminal, CheckCircle2, ChevronRight, ChevronDown, AlertCircle } from 'lucide-react'
import type { ToolCall, ToolResult } from '@/types/chat'

interface ToolCallIndicatorProps {
  tool_calls?: ToolCall[]
  tool_results?: ToolResult[]
  streaming?: boolean
}

const TOOL_LABELS: Record<string, string> = {
  list_leads:          'Listing leads',
  get_lead:            'Looking up lead',
  search_leads:        'Searching leads',
  get_pipeline_stats:  'Getting pipeline stats',
  generate_lead_brief: 'Generating brief',
  export_leads_csv:    'Exporting CSV',
  trigger_lead_run:    'Preparing pipeline run',
  update_lead_stage:   'Preparing stage update',
}

export function ToolCallIndicator({ tool_calls, tool_results, streaming }: ToolCallIndicatorProps) {
  const [open, setOpen] = useState(false)

  if (!tool_calls?.length) return null

  const total    = tool_calls.length
  const doneCount = tool_results?.length ?? 0
  const allDone  = doneCount >= total && !streaming
  const hasError = tool_results?.some(r => r.error)

  const summary = allDone
    ? `Ran ${total} ${total === 1 ? 'command' : 'commands'}`
    : `Running…`

  return (
    <div className="mb-1">
      {/* Collapsed header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-xs text-gray-400 dark:text-neutral-500 hover:text-gray-600 dark:hover:text-neutral-300 transition-colors"
      >
        <span>{summary}</span>
        {open
          ? <ChevronDown  size={12} strokeWidth={1.75} />
          : <ChevronRight size={12} strokeWidth={1.75} />
        }
      </button>

      {/* Expanded timeline */}
      {open && (
        <div className="mt-2 ml-0.5">
          {tool_calls.map((tc, i) => {
            const result = tool_results?.[i]
            const label  = TOOL_LABELS[tc.name] ?? tc.name
            const error  = result?.error

            return (
              <div key={i} className="flex gap-3">
                {/* Left: icon + vertical line that extends to next row */}
                <div className="flex flex-col items-center w-6 shrink-0">
                  <div className="flex items-center justify-center w-6 h-6 rounded bg-gray-100 dark:bg-neutral-800 shrink-0">
                    <Terminal size={12} className="text-gray-500 dark:text-neutral-400" strokeWidth={1.75} />
                  </div>
                  {/* Line runs to the bottom of this row and connects to the next */}
                  <div className="w-px flex-1 min-h-[20px] bg-gray-200 dark:bg-neutral-700 mt-1" />
                </div>

                {/* Right: label + count + Script tag */}
                <div className="flex flex-col gap-1 pb-4 pt-0.5">
                  <span className={`text-xs ${error ? 'text-red-500' : 'text-gray-600 dark:text-neutral-300'}`}>
                    {label}
                    {result?.count !== undefined && !error && (
                      <span className="text-gray-400 dark:text-neutral-500"> ({result.count} {result.count === 1 ? 'result' : 'results'})</span>
                    )}
                    {error && <span className="text-red-400"> — {error}</span>}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-800 text-gray-400 dark:text-neutral-500 w-fit">
                    {error ? 'Error' : 'Script'}
                  </span>
                </div>
              </div>
            )
          })}

          {/* Done / error footer — sits at the bottom of the last line */}
          <div className="flex items-center gap-3">
            <div className="w-6 flex justify-center shrink-0">
              {hasError
                ? <AlertCircle  size={14} className="text-red-400" />
                : <CheckCircle2 size={14} className={allDone ? 'text-gray-500 dark:text-neutral-400' : 'text-gray-300 dark:text-neutral-600'} />
              }
            </div>
            <span className={`text-xs font-medium ${hasError ? 'text-red-500' : allDone ? 'text-gray-600 dark:text-neutral-300' : 'text-gray-300 dark:text-neutral-600'}`}>
              {hasError ? 'Failed' : allDone ? 'Done' : 'Running…'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
