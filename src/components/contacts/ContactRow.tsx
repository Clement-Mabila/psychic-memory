'use client'
import { useState } from 'react'
import {
  Calendar, ShieldCheck,
  Star, Share2, ShieldOff, BadgeCheck, Wallet, User,
  CheckCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/Avatar'
import { RowActions } from './RowActions'
import type { Contact } from './types'

// ── TierBadge ─────────────────────────────────────────────────────────────────

const TIER_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  verified:  { bg: 'bg-blue-50 dark:bg-blue-950/40',   text: 'text-white', label: 'Verified'  },
  probable:  { bg: 'bg-amber-400',                      text: 'text-white', label: 'Probable'  },
  inferred:  { bg: 'bg-pink-500',                       text: 'text-white', label: 'Inferred'  },
  not_found: { bg: 'bg-red-50 dark:bg-red-950/400',    text: 'text-white', label: 'No Email'  },
  blocked:   { bg: 'bg-gray-800',                       text: 'text-white', label: 'Blocked'   },
}

function TierBadge({ tier }: { tier: string }) {
  const s = TIER_BADGE[tier] ?? TIER_BADGE.not_found
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', s.bg, s.text)}>
      {s.label}
    </span>
  )
}

// ── RoleCell ──────────────────────────────────────────────────────────────────

const ROLE_META: Record<string, { icon: React.ElementType; color: string }> = {
  champion:       { icon: Star,       color: 'text-violet-500 dark:text-violet-400' },
  influencer:     { icon: Share2,     color: 'text-blue-500 dark:text-blue-400'   },
  blocker:        { icon: ShieldOff,  color: 'text-red-400'                        },
  approver:       { icon: BadgeCheck, color: 'text-amber-500 dark:text-amber-400'  },
  economic_buyer: { icon: Wallet,     color: 'text-emerald-500 dark:text-emerald-400' },
  other:          { icon: User,       color: 'text-slate-400 dark:text-slate-500'  },
}

function RoleCell({ role }: { role: string }) {
  const meta = ROLE_META[role] ?? ROLE_META.other
  const Icon = meta.icon
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={cn('h-3.5 w-3.5 flex-shrink-0', meta.color)} strokeWidth={1.75} />
      <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">{role.replace(/_/g, ' ')}</span>
    </div>
  )
}

// ── EmailCell ─────────────────────────────────────────────────────────────────

function EmailCell({ email }: { email: string }) {
  const [visible, setVisible] = useState(false)
  const [copied,  setCopied]  = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true)
      setTimeout(() => { setCopied(false); setVisible(false) }, 1500)
    })
  }

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => { if (!copied) setVisible(false) }}
    >
      <div className={cn(
        'absolute bottom-full left-0 mb-2.5 z-50 transition-all duration-150',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none',
      )}>
        <div
          onClick={handleCopy}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-md px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors select-none whitespace-nowrap"
        >
          {copied ? (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <CheckCheck className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="text-sm font-medium">Copied!</span>
            </div>
          ) : (
            <>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-0.5">Click to copy</p>
              <p className="text-sm font-medium text-black dark:text-slate-100">{email}</p>
            </>
          )}
        </div>
        <div className="absolute -bottom-1.5 left-5 w-3 h-3 bg-white dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-700 rotate-45" />
      </div>
      <span className="truncate max-w-[160px] cursor-default text-sm font-medium text-slate-800 dark:text-slate-200">
        {email}
      </span>
    </div>
  )
}

// ── ContactRow ────────────────────────────────────────────────────────────────

export function ContactRow({
  contact,
  selected,
  onSelect,
  onResolved,
  onRowClick,
}: {
  contact: Contact
  selected: boolean
  onSelect: (id: string) => void
  onResolved: (id: string) => void
  onRowClick: (c: Contact) => void
}) {
  const dateLabel = contact.modified
    ? new Date(contact.modified).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '—'

  return (
    <tr
      className={cn(
        'border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer',
        selected && 'bg-violet-50 dark:bg-violet-950/40',
      )}
      onClick={() => onRowClick(contact)}
    >
      <td className="py-4 px-4 w-10" onClick={e => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(contact.id)}
          className="w-4 h-4 rounded border-slate-300 accent-fuchsia-600 cursor-pointer"
        />
      </td>

      <td className="py-4 px-4">
        <div className="flex items-center gap-2.5">
          <Avatar name={contact.name} email={contact.email} size="xs" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate max-w-[140px]">{contact.name}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[140px]">{contact.title}</p>
          </div>
        </div>
      </td>

      <td className="py-4 px-4">
        <p className="text-sm text-slate-800 dark:text-slate-200 truncate max-w-[140px]">{contact.lead_name ?? '—'}</p>
        {contact.lead_domain && (
          <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[140px]">{contact.lead_domain}</p>
        )}
      </td>

      <td className="py-4 px-4">
        <TierBadge tier={contact.verification_tier} />
        {contact.verified_with_zerobounce && (
          <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
            <ShieldCheck className="h-3 w-3" /> ZB
          </span>
        )}
      </td>

      <td className="py-4 px-4 min-w-[180px]" onClick={e => e.stopPropagation()}>
        {contact.email
          ? <EmailCell email={contact.email} />
          : contact.ai_inferred_email
            ? <span className="text-sm font-medium text-slate-400 dark:text-slate-500 italic block truncate max-w-[160px]">{contact.ai_inferred_email}</span>
            : <span className="text-sm text-slate-300 dark:text-slate-600">—</span>}
      </td>

      <td className="py-4 px-4"><RoleCell role={contact.buying_role} /></td>

      <td className="py-4 px-4 hidden lg:table-cell">
        <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
          <Calendar className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 flex-shrink-0" />
          {dateLabel}
        </div>
      </td>

      <td className="py-4 px-2" onClick={e => e.stopPropagation()}>
        <RowActions contact={contact} onResolved={onResolved} onOpenPanel={onRowClick} />
      </td>
    </tr>
  )
}
