import { cn } from '@/lib/utils'
import { TIER_META } from './constants'

interface TierBadgeProps {
  tier: string
}

export function TierBadge({ tier }: TierBadgeProps) {
  const m = TIER_META[tier]
  if (!m) return null
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
        m.activeBg,
        m.activeText,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', m.dot)} />
      {m.label}
    </span>
  )
}
