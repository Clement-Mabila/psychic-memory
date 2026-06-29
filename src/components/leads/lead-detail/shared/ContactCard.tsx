'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CONTACT_COLOURS } from '../constants'
import { initials } from '../utils'

export function ContactCard({ contact, index }: { contact: any; index: number }) {
  const colour   = CONTACT_COLOURS[index % CONTACT_COLOURS.length]
  const verified = contact.email_confidence === 'verified' || contact.email_verified
  const probable = contact.email_confidence === 'probable'
  const [copied, setCopied] = useState(false)

  const copyEmail = () => {
    navigator.clipboard.writeText(contact.email)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-gray-50 dark:border-neutral-800 last:border-0">
      <div className="relative flex-shrink-0">
        <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white', colour)}>
          {initials(contact.name)}
        </div>
        <div className={cn(
          'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-neutral-900',
          verified ? 'bg-emerald-400' : probable ? 'bg-amber-400' : 'bg-gray-300 dark:bg-neutral-600',
        )} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{contact.name}</p>
          {contact.buying_role && (
            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 px-1.5 py-px rounded-full font-medium">
              {contact.buying_role.replace(/_/g, ' ')}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 dark:text-slate-500 truncate">{contact.title || '—'}</p>
        {contact.email && (
          <p className="text-xs text-blue-600 dark:text-blue-400 font-mono truncate">{contact.email}</p>
        )}
      </div>

      {contact.email && (
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={cn(
            'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
            verified ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
              : probable ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
              : 'bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-slate-400',
          )}>
            {contact.email_confidence?.replace(/_/g, ' ') ?? 'unknown'}
          </span>
          <button onClick={copyEmail} className="p-1 rounded text-gray-300 dark:text-slate-600 hover:text-gray-500 transition-colors">
            {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
          </button>
        </div>
      )}
    </div>
  )
}
