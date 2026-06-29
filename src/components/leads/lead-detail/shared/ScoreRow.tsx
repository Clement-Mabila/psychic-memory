import { cn } from '@/lib/utils'
import { scoreBarColour, scoreTextColour } from '../utils'

export function ScoreRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 text-xs text-gray-500 dark:text-slate-400 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-neutral-800 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', scoreBarColour(value))}
          style={{ width: value != null ? `${Math.min(value, 100)}%` : '0%' }}
        />
      </div>
      <span className={cn('text-xs font-bold w-7 text-right flex-shrink-0', scoreTextColour(value))}>
        {value ?? '—'}
      </span>
    </div>
  )
}
