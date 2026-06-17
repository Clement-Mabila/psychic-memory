import { CheckCircle2, AlertCircle, Loader2, Clock } from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────

export const STALE_RUNNING_MS = 2 * 60 * 60 * 1000

export interface StatusConfig {
  label: string
  icon: React.ElementType
  banner: string
}

export const STATUS_CONFIG: Record<string, StatusConfig> = {
  success:     { label: 'Completed',   icon: CheckCircle2, banner: 'bg-emerald-50 dark:bg-emerald-950/400 text-white'  },
  failed:      { label: 'Failed',      icon: AlertCircle,  banner: 'bg-red-50 dark:bg-red-950/400 text-white'      },
  running:     { label: 'Running',     icon: Loader2,      banner: 'bg-blue-50 dark:bg-blue-950/40 text-white'     },
  pending:     { label: 'Queued',      icon: Clock,        banner: 'bg-amber-50 dark:bg-amber-950/400 text-white'    },
  interrupted: { label: 'Interrupted', icon: AlertCircle,  banner: 'bg-slate-400 text-white'   },
}

// ── Resolvers ─────────────────────────────────────────────────────────────────

export function resolveStatus(status: string, created: string | null): string {
  if (status !== 'running' || !created) return status
  return Date.now() - new Date(created).getTime() > STALE_RUNNING_MS ? 'interrupted' : 'running'
}

// ── Formatters ────────────────────────────────────────────────────────────────

export function fmtDuration(ms: number | null): string | null {
  if (!ms) return null
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

export function fmtCost(usd: number | null): string | null {
  if (usd == null || usd === 0) return null
  return `$${usd.toFixed(4)}`
}

export function fmtTokens(input: number | null, output: number | null): string | null {
  if (!input) return null
  return `${Math.round(((input ?? 0) + (output ?? 0)) / 1000)}k tok`
}

// ── Tag builder ───────────────────────────────────────────────────────────────

export interface Tag {
  label: string
  cls: string
}

export function buildTags(log: any, resolved: string): Tag[] {
  const statusCfg = STATUS_CONFIG[resolved] ?? STATUS_CONFIG['pending']
  const tags: Tag[] = [{ label: statusCfg.label, cls: statusCfg.banner }]

  const tokens   = fmtTokens(log.input_tokens, log.output_tokens)
  const cost     = fmtCost(log.cost_usd)
  const duration = fmtDuration(log.latency_ms)
  const isCritic = log.score !== undefined

  if (tokens)   tags.push({ label: tokens,                cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' })
  if (cost)     tags.push({ label: cost,                  cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' })
  if (duration) tags.push({ label: duration,              cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' })
  if (isCritic && log.score !== undefined)
    tags.push({ label: `Score ${log.score}`,              cls: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700' })
  if (log.was_overridden)
    tags.push({ label: 'Force-approved',                  cls: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400' })
  if (log.attempt_number > 1)
    tags.push({ label: `Attempt ${log.attempt_number}`,  cls: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' })

  return tags
}