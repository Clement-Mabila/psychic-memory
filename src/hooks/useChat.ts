'use client'
import { useState, useCallback, useRef } from 'react'
import { createSession, listSessions, getSession } from '@/lib/chatApi'
import { useChatStream } from './useChatStream'
import type { ChatMessage, PendingAction, SSEDonePayload, ToolCall, ToolResult } from '@/types/chat'

let _msgCounter = 0
function uid() { return `msg-${++_msgCounter}` }

export function useChat() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages,  setMessages]  = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const streamingIdRef = useRef<string | null>(null)

  const appendToken = useCallback((chunk: string) => {
    setMessages(prev => {
      const last = prev[prev.length - 1]
      if (last?.id === streamingIdRef.current) {
        return [
          ...prev.slice(0, -1),
          { ...last, content: last.content + chunk },
        ]
      }
      return prev
    })
  }, [])

  const { send, abort } = useChatStream({
    onEvent: useCallback((event) => {
      switch (event.type) {
        case 'thinking':
          setMessages(prev => {
            const last = prev[prev.length - 1]
            if (last?.id === streamingIdRef.current) {
              return [...prev.slice(0, -1), { ...last, thinking: true }]
            }
            return prev
          })
          break

        case 'thinking_content':
          setMessages(prev => {
            const last = prev[prev.length - 1]
            if (last?.id === streamingIdRef.current) {
              return [...prev.slice(0, -1), { ...last, thinking: false, thinking_content: event.content }]
            }
            return prev
          })
          break

        case 'token':
          // Clear thinking flag on first token
          setMessages(prev => {
            const last = prev[prev.length - 1]
            if (last?.id === streamingIdRef.current && last.thinking) {
              return [...prev.slice(0, -1), { ...last, thinking: false }]
            }
            return prev
          })
          appendToken(event.chunk)
          break

        case 'tool_call':
          setMessages(prev => {
            const last = prev[prev.length - 1]
            if (last?.id === streamingIdRef.current) {
              const existing = last.tool_calls ?? []
              return [
                ...prev.slice(0, -1),
                { ...last, tool_calls: [...existing, event.tool] },
              ]
            }
            return prev
          })
          break

        case 'tool_result':
          setMessages(prev => {
            const last = prev[prev.length - 1]
            if (last?.id === streamingIdRef.current) {
              const existing = last.tool_results ?? []
              return [
                ...prev.slice(0, -1),
                { ...last, tool_results: [...existing, event.result] },
              ]
            }
            return prev
          })
          break

        case 'confirmation_required':
          setPendingAction(event.action)
          setStreaming(false)
          break

        case 'done':
          setMessages(prev => {
            const last = prev[prev.length - 1]
            if (last?.id === streamingIdRef.current) {
              return [
                ...prev.slice(0, -1),
                {
                  ...last,
                  streaming:  false,
                  model_used: event.payload.model,
                  intent:     event.payload.intent,
                  latency_ms: event.payload.latency_ms,
                  cost_usd:   event.payload.cost_usd,
                  fallback:   event.payload.fallback,
                },
              ]
            }
            return prev
          })
          setStreaming(false)
          streamingIdRef.current = null
          break

        case 'error':
          setMessages(prev => {
            const last = prev[prev.length - 1]
            if (last?.id === streamingIdRef.current) {
              return [
                ...prev.slice(0, -1),
                { ...last, streaming: false, error: event.message },
              ]
            }
            return prev
          })
          setStreaming(false)
          streamingIdRef.current = null
          break
      }
    }, [appendToken]),
  })

  const sendMessage = useCallback(async (text: string) => {
    if (streaming || !text.trim()) return

    // Ensure session exists
    let sid = sessionId
    if (!sid) {
      const { session_id } = await createSession()
      setSessionId(session_id)
      sid = session_id
    }

    // Append user message
    setMessages(prev => [
      ...prev,
      { id: uid(), role: 'user', content: text, created: new Date().toISOString() },
    ])

    // Prepare streaming assistant placeholder
    const aId = uid()
    streamingIdRef.current = aId
    setMessages(prev => [
      ...prev,
      { id: aId, role: 'assistant', content: '', streaming: true },
    ])
    setStreaming(true)

    await send(sid, text)
  }, [sessionId, streaming, send])

  const loadSession = useCallback(async (id: string) => {
    const { turns } = await getSession(id)
    setSessionId(id)
    setMessages(turns.map(t => ({ ...t, id: t.id ?? uid() })))
  }, [])

  const clearMessages = useCallback(() => {
    abort()
    setMessages([])
    setSessionId(null)
    setStreaming(false)
    setPendingAction(null)
    streamingIdRef.current = null
  }, [abort])

  const dismissAction = useCallback(() => setPendingAction(null), [])

  return {
    sessionId,
    messages,
    streaming,
    pendingAction,
    sendMessage,
    loadSession,
    clearMessages,
    dismissAction,
    abort,
  }
}
