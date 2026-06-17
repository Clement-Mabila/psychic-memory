'use client'
import { useCallback, useRef } from 'react'
import { streamMessage } from '@/lib/chatApi'
import type { ChatMessage, PendingAction, SSEDonePayload, ToolCall, ToolResult } from '@/types/chat'

export type StreamEvent =
  | { type: 'thinking' }
  | { type: 'thinking_content';     content: string }
  | { type: 'token';                chunk: string }
  | { type: 'tool_call';            tool: ToolCall }
  | { type: 'tool_result';          result: ToolResult }
  | { type: 'confirmation_required'; action: PendingAction }
  | { type: 'done';                 payload: SSEDonePayload }
  | { type: 'error';                message: string }

interface UseChatStreamOptions {
  onEvent: (event: StreamEvent) => void
}

export function useChatStream({ onEvent }: UseChatStreamOptions) {
  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(async (sessionId: string, message: string) => {
    // Cancel any in-flight stream
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    let res: Response
    try {
      res = await streamMessage(sessionId, message, ctrl.signal)
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'AbortError') return
      onEvent({ type: 'error', message: String(err) })
      return
    }

    if (!res.ok || !res.body) {
      onEvent({ type: 'error', message: `Server error ${res.status}` })
      return
    }

    const reader  = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      let done: boolean
      let value: Uint8Array | undefined
      try {
        ;({ done, value } = await reader.read())
      } catch {
        break
      }
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const raw = line.slice(6).trim()
        if (!raw) continue

        let parsed: { type: string; [k: string]: unknown }
        try {
          parsed = JSON.parse(raw)
        } catch {
          continue
        }

        switch (parsed.type) {
          case 'thinking':
            onEvent({ type: 'thinking' })
            break
          case 'thinking_content':
            onEvent({ type: 'thinking_content', content: (parsed.content as string) ?? '' })
            break
          case 'token':
            onEvent({ type: 'token', chunk: (parsed.content as string) ?? (parsed.chunk as string) ?? '' })
            break
          case 'tool_call':
            onEvent({ type: 'tool_call', tool: { name: (parsed.tool ?? parsed.name) as string, args: (parsed.args as Record<string, unknown>) ?? {} } })
            break
          case 'tool_result':
            onEvent({ type: 'tool_result', result: { name: (parsed.tool ?? parsed.name) as string, count: parsed.count as number, error: parsed.error as string | undefined } })
            break
          case 'confirmation_required':
            onEvent({
              type: 'confirmation_required',
              action: {
                action_id:     parsed.action_id as string,
                action_type:   parsed.action_type as string,
                required_text: parsed.required_text as string,
                description:   parsed.description as string,
              },
            })
            break
          case 'done':
            onEvent({ type: 'done', payload: parsed as unknown as SSEDonePayload })
            break
          case 'error':
            onEvent({ type: 'error', message: (parsed.message as string) ?? 'Unknown error' })
            break
        }
      }
    }
  }, [onEvent])

  const abort = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { send, abort }
}
