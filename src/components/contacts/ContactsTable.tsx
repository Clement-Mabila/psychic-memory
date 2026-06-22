'use client'
import { Check, Loader2, Users, ShieldCheck, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ContactRow } from './ContactRow'
import type { Contact, SortField, SortDir } from './types'

// ── Sort helper ───────────────────────────────────────────────────────────────

export function sortContacts(contacts: Contact[], field: SortField, dir: SortDir): Contact[] {
  if (!field) return contacts
  return [...contacts].sort((a, b) => {
    let av = '', bv = ''
    if (field === 'name')     { av = a.name.toLowerCase();              bv = b.name.toLowerCase() }
    if (field === 'company')  { av = (a.lead_name ?? '').toLowerCase(); bv = (b.lead_name ?? '').toLowerCase() }
    if (field === 'role')     { av = a.buying_role;                     bv = b.buying_role }
    if (field === 'modified') { av = a.modified ?? '';                  bv = b.modified ?? '' }
    if (av < bv) return dir === 'asc' ? -1 : 1
    if (av > bv) return dir === 'asc' ?  1 : -1
    return 0
  })
}

// ── Sortable header ───────────────────────────────────────────────────────────

function SortHead({ label, field, sortField, sortDir, onSort, className }: {
  label: string
  field: SortField
  sortField: SortField
  sortDir: SortDir
  onSort: (f: SortField, d: SortDir) => void
  className?: string
}) {
  const active = sortField === field
  return (
    <th
      className={cn('py-3.5 px-4 text-sm font-medium text-slate-900 dark:text-slate-100 cursor-pointer select-none', className)}
      onClick={() => onSort(field, active && sortDir === 'asc' ? 'desc' : 'asc')}
    >
      <div className="flex items-center gap-1.5">
        {label}
        {active
          ? sortDir === 'asc'
            ? <ChevronUp className="h-3.5 w-3.5" />
            : <ChevronDown className="h-3.5 w-3.5" />
          : <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />}
      </div>
    </th>
  )
}

// ── Pagination ────────────────────────────────────────────────────────────────

function buildPageNumbers(current: number, total: number): (number | string)[] {
  const pages: (number | string)[] = []
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - 1 && i <= current + 1)) pages.push(i)
    else if ((i === 2 && current > 3) || (i === total - 1 && current < total - 2))
      pages.push(i === 2 ? 'start' : 'end')
  }
  return pages
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  const pages = buildPageNumbers(page, totalPages)
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center gap-1 justify-center pt-2">
      <button onClick={() => onPage(page - 1)} disabled={page === 1} className="px-2 h-8 text-xs rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed">← Prev</button>
      {pages.map((p, i) => (
        typeof p === 'number'
          ? <button key={p} onClick={() => onPage(p)} className={cn('h-8 w-8 text-xs rounded-lg', page === p ? 'bg-slate-900 dark:bg-neutral-700 text-white' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-neutral-800')}>{p}</button>
          : <span key={`e-${i}`} className="h-8 w-6 flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs">…</span>
      ))}
      <button onClick={() => onPage(page + 1)} disabled={page === totalPages} className="px-2 h-8 text-xs rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed">Next →</button>
    </div>
  )
}

// ── BulkActionBar ─────────────────────────────────────────────────────────────

function BulkActionBar({ count, onVerify, onClear, isPending }: {
  count: number; onVerify: () => void; onClear: () => void; isPending: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-fuchsia-50 dark:bg-fuchsia-950/40 border border-fuchsia-100 dark:border-fuchsia-800 rounded-xl">
      <div className="flex items-center gap-2 text-xs text-fuchsia-700 dark:text-fuchsia-300 font-medium">
        <Check className="h-4 w-4 flex-shrink-0" />
        {count} contact{count !== 1 ? 's' : ''} selected
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onClear} className="h-7 px-2.5 text-xs text-fuchsia-600 dark:text-fuchsia-400 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-950/40 rounded-lg transition-colors">
          Deselect
        </button>
        <button
          onClick={onVerify}
          disabled={isPending}
          className="inline-flex items-center gap-1.5 h-7 px-3 text-xs font-medium bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
          {isPending ? 'Verifying…' : 'Verify with ZeroBounce'}
        </button>
      </div>
    </div>
  )
}

// ── ContactsTable ─────────────────────────────────────────────────────────────

export function ContactsTable({
  contacts,
  isLoading,
  search,
  selected,
  sortField,
  sortDir,
  page,
  totalPages,
  bulkState,
  onToggleAll,
  onToggleSelect,
  onSort,
  onPage,
  onResolved,
  onBulkVerify,
  onBulkClear,
}: {
  contacts: Contact[]
  isLoading: boolean
  search: string
  selected: Set<string>
  sortField: SortField
  sortDir: SortDir
  page: number
  totalPages: number
  bulkState: 'idle' | 'pending' | 'done' | 'failed'
  onToggleAll: () => void
  onToggleSelect: (id: string) => void
  onSort: (f: SortField, d: SortDir) => void
  onPage: (p: number) => void
  onResolved: (id: string) => void
  onBulkVerify: () => void
  onBulkClear: () => void
}) {
  return (
    <div className="space-y-4">
      {selected.size > 0 && (
        <BulkActionBar
          count={selected.size}
          onVerify={onBulkVerify}
          onClear={onBulkClear}
          isPending={bulkState === 'pending'}
        />
      )}

      {bulkState === 'done' && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 rounded-xl text-xs text-emerald-700 dark:text-emerald-400 font-medium">
          <Check className="h-4 w-4" /> Batch verification complete — results updated.
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center h-48 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
          <Loader2 className="h-5 w-5 text-slate-300 dark:text-neutral-600 animate-spin" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="p-16 text-center rounded-lg bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700">
          <div className="w-20 h-20 bg-gradient-to-br from-fuchsia-500 to-violet-600 rounded-3xl flex items-center justify-center mx-auto mb-6 rotate-6">
            <Users className="w-10 h-10 text-white -rotate-6" />
          </div>
          <h3 className="text-xl font-medium text-slate-800 dark:text-slate-200 mb-2">No contacts found</h3>
          <p className="text-slate-400 dark:text-slate-500">
            {search ? 'Try adjusting your search or filters' : 'No contacts have been identified yet'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-100 dark:bg-neutral-800 border-b border-slate-200 dark:border-neutral-700">
                  <th className="py-3.5 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={selected.size === contacts.length && contacts.length > 0}
                      onChange={onToggleAll}
                      className="w-4 h-4 rounded border-slate-300 accent-fuchsia-600 cursor-pointer"
                    />
                  </th>
                  <SortHead label="Name"     field="name"     sortField={sortField} sortDir={sortDir} onSort={onSort} />
                  <SortHead label="Company"  field="company"  sortField={sortField} sortDir={sortDir} onSort={onSort} />
                  <th className="py-3.5 px-4 text-sm font-medium text-slate-900 dark:text-slate-100">Status</th>
                  <th className="py-3.5 px-4 text-sm font-medium text-slate-900 dark:text-slate-100 min-w-[180px]">Email</th>
                  <SortHead label="Role"     field="role"     sortField={sortField} sortDir={sortDir} onSort={onSort} />
                  <SortHead label="Modified" field="modified" sortField={sortField} sortDir={sortDir} onSort={onSort} className="hidden lg:table-cell" />
                  <th className="py-3.5 px-4 w-10" />
                </tr>
              </thead>
              <tbody>
                {contacts.map(c => (
                  <ContactRow
                    key={c.id}
                    contact={c}
                    selected={selected.has(c.id)}
                    onSelect={onToggleSelect}
                    onResolved={onResolved}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {contacts.length} contact{contacts.length !== 1 ? 's' : ''}
              {selected.size > 0 && (
                <span className="ml-2 text-fuchsia-600 dark:text-fuchsia-400 font-medium">· {selected.size} selected</span>
              )}
            </p>
          </div>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPage={onPage} />
    </div>
  )
}
