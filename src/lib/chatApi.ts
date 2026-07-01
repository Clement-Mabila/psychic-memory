import Cookies from 'js-cookie'
import type { ChatSession, ChatMessage } from '@/types/chat'

const BASE = '/api/console'

// SSE bypasses the Next.js rewrite proxy (which buffers streaming responses).
// Goes directly to Django with the auth token in headers — CORS allows localhost:3000.
const STREAM_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000') + '/api/console'

function authHeader(): Record<string, string> {
  const token = Cookies.get('access_token')
  return {
    'ngrok-skip-browser-warning': 'true',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export async function listSessions(): Promise<ChatSession[]> {
  const res = await fetch(`${BASE}/chat/sessions`, { headers: authHeader() })
  if (!res.ok) throw new Error('Failed to fetch sessions')
  return res.json()
}

export async function createSession(): Promise<{ session_id: string }> {
  const res = await fetch(`${BASE}/chat/sessions`, {
    method: 'POST',
    headers: authHeader(),
  })
  if (!res.ok) throw new Error('Failed to create session')
  return res.json()
}

export async function getSession(sessionId: string): Promise<{ id: string; title: string; turns: ChatMessage[] }> {
  const res = await fetch(`${BASE}/chat/sessions/${sessionId}`, { headers: authHeader() })
  if (!res.ok) throw new Error('Failed to fetch session')
  return res.json()
}

export async function closeSession(sessionId: string): Promise<void> {
  await fetch(`${BASE}/chat/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: authHeader(),
  })
}

export async function confirmAction(
  actionId: string,
  confirmationText: string,
): Promise<{ success: boolean; result: unknown }> {
  const res = await fetch(`${BASE}/chat/actions/${actionId}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ confirmation_text: confirmationText }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? 'Confirmation failed')
  }
  return res.json()
}

export async function uploadFile(file: File): Promise<{ task_id: string; file_name: string }> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/chat/uploads`, {
    method: 'POST',
    headers: authHeader(),
    body: form,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? 'Upload failed')
  }
  return res.json()
}

export function openMessageStream(sessionId: string, message: string): EventSource {
  // EventSource doesn't support POST, so we use fetch with ReadableStream
  // Return a fake EventSource-like object via AbortController + fetch
  throw new Error('Use useChatStream hook instead')
}

export function streamMessage(
  sessionId: string,
  message: string,
  signal: AbortSignal,
): Promise<Response> {
  return fetch(`${STREAM_BASE}/chat/sessions/${sessionId}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ message }),
    signal,
  })
}
