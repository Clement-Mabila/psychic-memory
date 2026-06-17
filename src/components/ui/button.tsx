import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'icon'
  loading?: boolean
}

const variants = {
  primary:   'bg-cyan-500 text-white hover:bg-cyan-700 border-cyan-400 dark:bg-cyan-600 dark:hover:bg-cyan-500 dark:border-cyan-500',
  secondary: 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200 shadow-xs dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:border-slate-600',
  ghost:     'bg-transparent text-gray-500 hover:bg-gray-50 border-transparent dark:text-slate-400 dark:hover:bg-slate-800',
  danger:    'bg-red-50 text-red-600 hover:bg-red-100 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/60 dark:border-red-800',
}

const sizes = {
  sm:   'h-9 px-2.5 text-xs rounded-2xl gap-1.5',
  md:   'h-9 px-3 text-sm rounded-lg gap-2',
  icon: 'h-9 w-9 rounded-md',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', loading, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium border transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
      )}
      {children}
    </button>
  )
)

Button.displayName = 'Button'
