'use client'

import { useState } from 'react'
import { Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CONTACT_COLOURS } from '../constants'
import { initials } from '../utils'
import { ContactCard } from '../shared/ContactCard'

export function ContactsTab({ contacts }: { contacts: any[] }) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? contacts : contacts.slice(0, 5)

  if (contacts.length === 0) {
    return (
      <div className="border border-gray-100 dark:border-neutral-800 rounded-xl p-12 text-center">
        <Users className="h-8 w-8 mx-auto mb-3 text-slate-300 dark:text-slate-600 opacity-50" />
        <p className="text-sm text-slate-400 dark:text-slate-500">No contacts yet — run the contact stage.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {contacts.length} contact{contacts.length !== 1 ? 's' : ''} found
        </h3>
        {contacts.length > 5 && (
          <button
            onClick={() => setShowAll(p => !p)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showAll ? 'Show fewer' : `+${contacts.length - 5} more`}
          </button>
        )}
      </div>

      {/* Avatar strip */}
      <div className="flex items-center gap-1.5 mb-4">
        {contacts.slice(0, 8).map((c, i) => (
          <div
            key={i}
            className="relative flex-shrink-0"
            title={`${c.name}${c.email ? ` · ${c.email}` : ''}`}
          >
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white dark:border-neutral-900',
              CONTACT_COLOURS[i % CONTACT_COLOURS.length],
            )}>
              {initials(c.name)}
            </div>
            {(c.email_confidence === 'verified' || c.email_verified) && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-neutral-900" />
            )}
          </div>
        ))}
        {contacts.length > 8 && (
          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center text-[10px] font-bold text-gray-500 border-2 border-white dark:border-neutral-900">
            +{contacts.length - 8}
          </div>
        )}
      </div>

      <div className="border border-gray-100 dark:border-neutral-800 rounded-xl px-4">
        {visible.map((c, i) => <ContactCard key={i} contact={c} index={i} />)}
      </div>
    </div>
  )
}
