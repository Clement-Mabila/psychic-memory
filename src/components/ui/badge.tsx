import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'neutral'
  className?: string
}

const variants = {
  default: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400',
  success: 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  danger:  'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400',
  info:    'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400',
  purple:  'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400',
  neutral: 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400',
}

export function Badge({ children, variant = 'neutral', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap', variants[variant], className)}>
      {children}
    </span>
  )
}
