'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface HoverCardProps {
  /** The element that triggers the hover */
  children: React.ReactNode
  /** Content rendered inside the floating card */
  content: React.ReactNode
  /** Extra classes applied to the card box */
  className?: string
  /** Tailwind left-* class for the arrow position (default: left-5) */
  arrowOffset?: string
  /** Which side the card appears on (default: top) */
  side?: 'top' | 'bottom'
}

/**
 * Small hover card — same design as the copy-email popup on the contacts page.
 * White card + arrow pointer + slide-in animation. Dark mode ready.
 */
export function HoverCard({
  children,
  content,
  className,
  arrowOffset = 'left-5',
  side = 'top',
}: HoverCardProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {/* Floating card */}
      <div className={cn(
        'absolute z-50 transition-all duration-150',
        side === 'top'    ? 'bottom-full mb-2.5' : 'top-full mt-2.5',
        side === 'top'
          ? visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none'
          : visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1 pointer-events-none',
      )}>
        <div className={cn(
          'bg-white dark:bg-neutral-900',
          'border border-slate-200 dark:border-neutral-700',
          'rounded-lg shadow-md px-3 py-2 whitespace-nowrap select-none',
          className,
        )}>
          {content}
        </div>

        {/* Arrow pointing down toward the trigger (top mode) */}
        {side === 'top' && (
          <div className={cn(
            'absolute -bottom-1.5 w-3 h-3',
            'bg-white dark:bg-neutral-900',
            'border-r border-b border-slate-200 dark:border-neutral-700',
            'rotate-45',
            arrowOffset,
          )} />
        )}

        {/* Arrow pointing up toward the trigger (bottom mode) */}
        {side === 'bottom' && (
          <div className={cn(
            'absolute -top-1.5 w-3 h-3',
            'bg-white dark:bg-neutral-900',
            'border-l border-t border-slate-200 dark:border-neutral-700',
            'rotate-45',
            arrowOffset,
          )} />
        )}
      </div>

      {children}
    </div>
  )
}
