const ROW_BASE = 'flex items-start gap-3 py-2.5 border-b border-gray-50 dark:border-neutral-800/60 last:border-0'
const INPUT_BASE = 'flex-1 text-sm bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg px-2.5 py-1 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 dark:focus:border-blue-600 text-gray-800 dark:text-slate-200 placeholder:text-gray-300 dark:placeholder:text-slate-600 transition-colors'

interface InfoRowProps {
  icon: React.ElementType
  label: string
  value: string | number | null
  editing: boolean
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}

export function InfoRow({ icon: Icon, label, value, editing, onChange, placeholder, type = 'text' }: InfoRowProps) {
  return (
    <div className={ROW_BASE}>
      <Icon size={13} className="text-gray-400 dark:text-slate-500 flex-shrink-0 mt-0.5" />
      <span className="w-28 text-xs text-gray-400 dark:text-slate-500 flex-shrink-0 pt-0.5">{label}</span>
      {editing ? (
        <input
          type={type}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className={INPUT_BASE}
        />
      ) : (
        <span className="text-sm text-gray-800 dark:text-slate-200 flex-1 leading-snug">
          {value != null && value !== ''
            ? String(value)
            : <span className="text-gray-300 dark:text-slate-600 text-xs italic">Not set</span>}
        </span>
      )}
    </div>
  )
}

interface SelectRowProps {
  icon: React.ElementType
  label: string
  value: string | null
  options: { value: string; label: string }[]
  editing: boolean
  onChange: (v: string) => void
}

export function SelectRow({ icon: Icon, label, value, options, editing, onChange }: SelectRowProps) {
  return (
    <div className={ROW_BASE}>
      <Icon size={13} className="text-gray-400 dark:text-slate-500 flex-shrink-0 mt-0.5" />
      <span className="w-28 text-xs text-gray-400 dark:text-slate-500 flex-shrink-0 pt-0.5">{label}</span>
      {editing ? (
        <select
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          className="flex-1 text-sm bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg px-2.5 py-1 outline-none focus:ring-2 focus:ring-blue-500/30 text-gray-800 dark:text-slate-200"
        >
          <option value="">—</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <span className="text-sm text-gray-800 dark:text-slate-200 flex-1">
          {options.find(o => o.value === value)?.label
            ?? <span className="text-gray-300 dark:text-slate-600 text-xs italic">Not set</span>}
        </span>
      )}
    </div>
  )
}
