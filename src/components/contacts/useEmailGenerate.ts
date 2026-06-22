'use client'
import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import Cookies from 'js-cookie'
import type { GenPhase } from './types'

export interface EmailGenResult {
  phase:    GenPhase
  thinking: string
  content:  string
  elapsed:  number
  parsed:   { subject: string; body: string }
  start:    () => Promise<void>
  reset:    () => void
  setPhase: (p: GenPhase) => void
}

export function useEmailGenerate(contactId: string): EmailGenResult {
  const [phase,    setPhase]    = useState<GenPhase>('idle')
  const [thinking, setThinking] = useState('')
  const [content,  setContent]  = useState('')
  const [elapsed,  setElapsed]  = useState(0)
  const abortRef  = useRef<AbortController | null>(null)
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (phase === 'thinking' || phase === 'content') {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000)
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      if (phase === 'idle') setElapsed(0)
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  }, [phase])

  const start = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    setPhase('thinking')
    setThinking('')
    setContent('')
    setElapsed(0)

    try {
      const token   = Cookies.get('access_token')
      const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? ''
      const resp    = await fetch(`${baseUrl}/api/console/contacts/${contactId}/generate-email`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        signal:  abortRef.current.signal,
      })
      if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`)

      const reader  = resp.body.getReader()
      const decoder = new TextDecoder()
      let   buf     = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''

        for (const part of parts) {
          let evType = 'message', data = ''
          for (const line of part.split('\n')) {
            if (line.startsWith('event: ')) evType = line.slice(7).trim()
            if (line.startsWith('data: '))  data   = line.slice(6).trim()
          }
          if (!data) continue
          try {
            const parsed = JSON.parse(data)
            if (evType === 'thinking') { setThinking(t => t + parsed.text); setPhase('thinking') }
            if (evType === 'content')  { setContent(c  => c  + parsed.text); setPhase('content')  }
            if (evType === 'done')     { setPhase('preview') }
            if (evType === 'error')    { setPhase('idle') }
          } catch { /* ignore */ }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') setPhase('idle')
    }
  }, [contactId])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setPhase('idle'); setThinking(''); setContent('')
  }, [])

  const parsed = useMemo(() => {
    if (!content) return { subject: '', body: '' }
    const nl = content.indexOf('\n\n')
    if (nl === -1) return { subject: content.replace(/^SUBJECT:\s*/i, '').trim(), body: '' }
    return {
      subject: content.slice(0, nl).replace(/^SUBJECT:\s*/i, '').trim(),
      body:    content.slice(nl + 2).trim(),
    }
  }, [content])

  return { phase, thinking, content, parsed, elapsed, start, reset, setPhase }
}
