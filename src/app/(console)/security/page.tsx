'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Lock, Monitor, Users, BookOpen, ShieldCheck,
  RefreshCw, LogOut, Key, CheckCircle, AlertTriangle,
  Smartphone, Copy,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { securityApi } from '@/lib/api'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDatetime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function roleBadge(role: string) {
  const map: Record<string, 'danger' | 'warning' | 'info' | 'success' | 'neutral'> = {
    super_admin: 'danger',
    admin:       'warning',
    manager:     'info',
    analyst:     'success',
    reviewer:    'neutral',
    read_only:   'neutral',
  }
  return <Badge variant={map[role] ?? 'neutral'}>{role.replace(/_/g, ' ')}</Badge>
}

// ── Tab types ─────────────────────────────────────────────────────────────────

type Tab = 'sessions' | 'mfa' | 'users' | 'audit'
const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'sessions', label: 'Active Sessions', icon: Monitor    },
  { id: 'mfa',      label: 'MFA',             icon: Smartphone },
  { id: 'users',    label: 'Users & Roles',   icon: Users      },
  { id: 'audit',    label: 'Audit Log',       icon: BookOpen   },
]

// ── Sessions tab ──────────────────────────────────────────────────────────────

function SessionsTab() {
  const qc = useQueryClient()

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['security-sessions'],
    queryFn:  securityApi.getSessions,
    staleTime: 30_000,
  })

  const revokeMut = useMutation({
    mutationFn: securityApi.revokeAllSessions,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['security-sessions'] }),
  })

  const sessions: any[] = data?.sessions ?? []
  const current: any    = data?.current_session

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-slate-400">
          {sessions.length} active session{sessions.length !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            <RefreshCw size={13} /> Refresh
          </Button>
          <Button
            variant="danger" size="sm"
            loading={revokeMut.isPending}
            onClick={() => {
              if (confirm('Revoke ALL sessions? You will be logged out of every device.')) revokeMut.mutate()
            }}
          >
            <LogOut size={13} /> Revoke All
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-8">Loading…</p>}

      <div className="space-y-2">
        {sessions.map((s: any) => (
          <div
            key={s.jti}
            className={cn(
              'bg-white dark:bg-slate-900 border rounded-xl p-4 flex items-center gap-4',
              s.jti === current?.jti
                ? 'border-indigo-200 dark:border-indigo-800'
                : 'border-gray-100 dark:border-slate-800',
            )}
          >
            <Monitor size={16} className={s.jti === current?.jti ? 'text-indigo-500' : 'text-gray-400 dark:text-slate-500'} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">
                  {s.ip_address ?? 'Unknown IP'}
                </p>
                {s.jti === current?.jti && <Badge variant="info">current</Badge>}
                {s.revoked_at && <Badge variant="danger">revoked</Badge>}
              </div>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                Created {fmtDatetime(s.created_at)}
                {s.user_agent ? ` · ${s.user_agent.slice(0, 60)}` : ''}
              </p>
            </div>
          </div>
        ))}

        {!isLoading && sessions.length === 0 && (
          <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-8">No active sessions</p>
        )}
      </div>
    </div>
  )
}

// ── MFA tab ───────────────────────────────────────────────────────────────────

function MfaTab() {
  const qc = useQueryClient()
  const [setupStep, setSetupStep] = useState<'idle' | 'scan' | 'confirm' | 'done'>('idle')
  const [confirmCode, setConfirmCode]   = useState('')
  const [disableCode, setDisableCode]   = useState('')
  const [backupCodes, setBackupCodes]   = useState<string[]>([])
  const [showDisable, setShowDisable]   = useState(false)
  const [copiedCode, setCopiedCode]     = useState<string | null>(null)

  const { data: status, refetch } = useQuery({
    queryKey: ['mfa-status'],
    queryFn:  securityApi.getMfaStatus,
    staleTime: 30_000,
  })

  const { data: setupData, isLoading: setupLoading } = useQuery({
    queryKey: ['mfa-setup-qr'],
    queryFn:  securityApi.setupMfa,
    enabled:  setupStep === 'scan',
    staleTime: Infinity,
  })

  const confirmMut = useMutation({
    mutationFn: () => securityApi.confirmMfa(confirmCode),
    onSuccess: (res: any) => {
      setBackupCodes(res.backup_codes ?? [])
      setSetupStep('done')
      qc.invalidateQueries({ queryKey: ['mfa-status'] })
    },
  })

  const disableMut = useMutation({
    mutationFn: () => securityApi.disableMfa(disableCode),
    onSuccess: () => {
      setShowDisable(false)
      setDisableCode('')
      setSetupStep('idle')
      qc.invalidateQueries({ queryKey: ['mfa-status'] })
    },
  })

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  const isVerified = status?.is_verified

  return (
    <div className="max-w-lg space-y-4">
      {/* Status card */}
      <Card>
        <CardHeader>
          <CardTitle>TOTP Authenticator</CardTitle>
          {isVerified
            ? <Badge variant="success"><CheckCircle size={11} /> Enabled</Badge>
            : <Badge variant="warning"><AlertTriangle size={11} /> Not configured</Badge>}
        </CardHeader>
        <CardBody>
          {isVerified ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 dark:text-slate-400">
                MFA is active. Use your authenticator app to generate codes on login.
                {status?.last_used_at && ` Last used: ${fmtDatetime(status.last_used_at)}.`}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500">
                Backup codes remaining: <span className="font-semibold text-gray-700 dark:text-slate-300">{status?.backup_codes_remaining ?? '—'}</span>
              </p>
              {!showDisable ? (
                <Button variant="danger" size="sm" onClick={() => setShowDisable(true)}>
                  Disable MFA
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="6-digit TOTP code to confirm…"
                    value={disableCode}
                    onChange={e => setDisableCode(e.target.value)}
                    maxLength={6}
                    className="flex-1 h-9 px-3 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none text-gray-700 dark:text-slate-300"
                  />
                  <Button size="sm" variant="danger" loading={disableMut.isPending} disabled={disableCode.length < 6} onClick={() => disableMut.mutate()}>
                    Confirm
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setShowDisable(false); setDisableCode('') }}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          ) : setupStep === 'idle' ? (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Add a second factor using any TOTP app (Google Authenticator, Authy, 1Password, etc.)
              </p>
              <Button variant="primary" size="sm" onClick={() => setSetupStep('scan')}>
                <Smartphone size={14} /> Set Up MFA
              </Button>
            </div>
          ) : setupStep === 'scan' ? (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Scan this QR code with your authenticator app, then enter the 6-digit code to verify.
              </p>
              {setupLoading
                ? <div className="h-40 bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse" />
                : setupData?.qr_data_uri && (
                  <img src={setupData.qr_data_uri} alt="MFA QR" className="w-40 h-40 rounded-lg border border-gray-200 dark:border-slate-700" />
                )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="6-digit code"
                  value={confirmCode}
                  onChange={e => setConfirmCode(e.target.value)}
                  maxLength={6}
                  className="w-32 h-9 px-3 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none text-gray-700 dark:text-slate-300 text-center tracking-widest font-mono"
                />
                <Button size="sm" variant="primary" loading={confirmMut.isPending} disabled={confirmCode.length < 6} onClick={() => confirmMut.mutate()}>
                  Verify
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSetupStep('idle')}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : setupStep === 'done' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle size={16} />
                <p className="text-sm font-medium">MFA enabled successfully</p>
              </div>
              {backupCodes.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-slate-300 mb-2">
                    Save these backup codes — they won't be shown again:
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {backupCodes.map(code => (
                      <button
                        key={code}
                        onClick={() => copyCode(code)}
                        className="flex items-center justify-between gap-2 px-3 py-1.5 bg-gray-50 dark:bg-slate-800 rounded-lg font-mono text-xs text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors group"
                      >
                        {code}
                        <Copy size={11} className={cn('flex-shrink-0', copiedCode === code ? 'text-green-500' : 'text-gray-300 dark:text-slate-600 group-hover:text-gray-500')} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <Button size="sm" variant="secondary" onClick={() => setSetupStep('idle')}>
                Done
              </Button>
            </div>
          ) : null}
        </CardBody>
      </Card>

      {/* Step-up token */}
      <Card>
        <CardHeader>
          <CardTitle>Step-Up Token</CardTitle>
          <Key size={14} className="text-gray-400 dark:text-slate-500" />
        </CardHeader>
        <CardBody>
          <StepUpTokenSection />
        </CardBody>
      </Card>
    </div>
  )
}

function StepUpTokenSection() {
  const [code, setCode]     = useState('')
  const [token, setToken]   = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const mut = useMutation({
    mutationFn: () => securityApi.requestStepUp(code),
    onSuccess: (res: any) => { setToken(res.token_id); setCode('') },
  })

  const copy = () => {
    if (!token) return
    navigator.clipboard.writeText(token)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 dark:text-slate-400">
        Some vault actions require a short-lived step-up token. Enter your TOTP code to generate one (valid 15 min).
      </p>
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="TOTP code"
          value={code}
          onChange={e => setCode(e.target.value)}
          maxLength={6}
          className="w-28 h-9 px-3 text-sm bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none text-gray-700 dark:text-slate-300 text-center tracking-widest font-mono"
        />
        <Button size="sm" variant="primary" loading={mut.isPending} disabled={code.length < 6} onClick={() => mut.mutate()}>
          Generate
        </Button>
      </div>
      {token && (
        <div className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg px-3 py-2">
          <code className="flex-1 text-xs font-mono text-indigo-700 dark:text-indigo-300 break-all">{token}</code>
          <button onClick={copy} className="flex-shrink-0">
            <Copy size={13} className={copied ? 'text-green-500' : 'text-indigo-400'} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Users & Roles tab ─────────────────────────────────────────────────────────

function UsersTab() {
  const qc = useQueryClient()
  const [search, setSearch]       = useState('')
  const [editingUser, setEditing] = useState<number | null>(null)
  const [selectedRole, setRole]   = useState<number | null>(null)

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['security-users', search],
    queryFn:  () => securityApi.getUsers({ search: search || undefined }),
    staleTime: 30_000,
  })

  const { data: rolesData } = useQuery({
    queryKey: ['security-roles'],
    queryFn:  securityApi.getRoles,
    staleTime: 300_000,
  })

  const assignMut = useMutation({
    mutationFn: ({ userId, roleId }: { userId: number; roleId: number }) =>
      securityApi.assignRole(userId, roleId),
    onSuccess: () => { setEditing(null); qc.invalidateQueries({ queryKey: ['security-users'] }) },
  })

  const users: any[] = usersData?.users ?? []
  const roles: any[] = rolesData?.roles ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1 max-w-xs h-9 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg px-2.5">
          <input
            type="text"
            placeholder="Search users…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-xs text-gray-600 dark:text-slate-300 placeholder:text-gray-400 outline-none"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-slate-800">
              {['User', 'Email', 'Role', 'MFA', 'Last Login', ''].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-xs text-gray-400 dark:text-slate-500">Loading…</td></tr>
            )}
            {users.map((u: any) => (
              <tr key={u.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                <td className="px-4 py-3">
                  <p className="text-xs font-medium text-gray-800 dark:text-slate-200">{u.username}</p>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-slate-400">{u.email}</td>
                <td className="px-4 py-3">
                  {editingUser === u.id ? (
                    <div className="flex items-center gap-1.5">
                      <select
                        defaultValue={u.role_id}
                        onChange={e => setRole(+e.target.value)}
                        className="h-7 px-2 text-xs bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md outline-none text-gray-700 dark:text-slate-300"
                      >
                        {roles.map((r: any) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => selectedRole && assignMut.mutate({ userId: u.id, roleId: selectedRole })}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Save
                      </button>
                      <button onClick={() => setEditing(null)} className="text-xs text-gray-400 dark:text-slate-500 hover:underline">
                        ✕
                      </button>
                    </div>
                  ) : (
                    u.role ? roleBadge(u.role) : <span className="text-xs text-gray-400 dark:text-slate-500">No role</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {u.mfa_enabled
                    ? <Badge variant="success">enabled</Badge>
                    : <Badge variant="neutral">off</Badge>}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400 dark:text-slate-500">{fmtDatetime(u.last_login)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => { setEditing(u.id); setRole(u.role_id) }} className="text-xs text-indigo-500 dark:text-indigo-400 hover:underline">
                    Edit role
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role legend */}
      {roles.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Roles</CardTitle></CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {roles.map((r: any) => (
                <div key={r.id} className="flex items-start gap-2">
                  {roleBadge(r.name)}
                  {r.description && (
                    <p className="text-xs text-gray-400 dark:text-slate-500 leading-snug">{r.description}</p>
                  )}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

// ── Audit log tab ─────────────────────────────────────────────────────────────

function AuditTab() {
  const [cursor, setCursor] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['security-audit', cursor, actionFilter],
    queryFn:  () => securityApi.getAuditLog({ cursor: cursor || undefined, action: actionFilter || undefined }),
    staleTime: 30_000,
  })

  const events: any[] = data?.events ?? []

  function severityColour(action: string) {
    if (action.includes('delete') || action.includes('erase') || action.includes('purge')) return 'text-red-500 dark:text-red-400'
    if (action.includes('approve') || action.includes('complete')) return 'text-amber-500 dark:text-amber-400'
    if (action.includes('login') || action.includes('token')) return 'text-indigo-500 dark:text-indigo-400'
    return 'text-gray-500 dark:text-slate-400'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="text"
          placeholder="Filter by action (e.g. vault.erasure_request)…"
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="flex-1 max-w-xs h-9 px-3 text-xs bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg text-gray-600 dark:text-slate-300 outline-none"
        />
        <Button variant="secondary" size="sm" onClick={() => { setCursor(null); refetch() }}>
          <RefreshCw size={13} /> Refresh
        </Button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-slate-800">
              {['Time', 'Actor', 'Action', 'Resource', 'IP'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 dark:text-slate-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-gray-400 dark:text-slate-500">Loading…</td></tr>
            )}
            {!isLoading && events.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-gray-400 dark:text-slate-500">No audit events</td></tr>
            )}
            {events.map((e: any) => (
              <tr key={e.id} className="border-b border-gray-50 dark:border-slate-800">
                <td className="px-4 py-2.5 text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap">
                  {fmtDatetime(e.created_at)}
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-600 dark:text-slate-300">{e.actor_email ?? '—'}</td>
                <td className={cn('px-4 py-2.5 text-xs font-mono font-medium', severityColour(e.action ?? ''))}>
                  {e.action}
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500 dark:text-slate-400">
                  {e.resource_type}{e.resource_id ? ` ${e.resource_id.slice(0, 8)}…` : ''}
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-400 dark:text-slate-500">{e.ip_address ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {data?.next_cursor && (
          <div className="px-4 py-2.5 border-t border-gray-50 dark:border-slate-800">
            <Button variant="ghost" size="sm" onClick={() => setCursor(data.next_cursor)}>
              Load more
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SecurityPage() {
  const [tab, setTab] = useState<Tab>('sessions')

  const { data: me } = useQuery({
    queryKey: ['security-me'],
    queryFn:  securityApi.getMe,
    staleTime: 300_000,
  })

  return (
    <div className="p-6 max-w-[1200px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-slate-100 flex items-center gap-2">
            <Lock size={20} className="text-indigo-500" />
            Security
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            {me?.email
              ? <>Signed in as <span className="font-medium text-gray-700 dark:text-slate-300">{me.email}</span> · {me.role ?? 'no role'}</>
              : 'Sessions · MFA · Users & Roles · Audit Log'
            }
          </p>
        </div>
        {me?.permissions && (
          <div className="flex items-center gap-1 flex-wrap max-w-xs justify-end">
            {me.permissions.slice(0, 5).map((p: string) => (
              <Badge key={p} variant="neutral" className="text-[10px]">{p}</Badge>
            ))}
            {me.permissions.length > 5 && (
              <Badge variant="neutral" className="text-[10px]">+{me.permissions.length - 5}</Badge>
            )}
          </div>
        )}
      </div>

      {/* Tab nav */}
      <div className="flex items-center mb-6 gap-0.5">
        {TABS.map(t => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors font-normal',
                tab === t.id
                  ? 'bg-gray-100 dark:bg-slate-800 text-gray-900 dark:text-slate-100'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800',
              )}
            >
              <Icon size={14} />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'sessions' && <SessionsTab />}
      {tab === 'mfa'      && <MfaTab />}
      {tab === 'users'    && <UsersTab />}
      {tab === 'audit'    && <AuditTab />}
    </div>
  )
}
