import type { ReactNode } from 'react'

interface Props {
  title: string
  children: ReactNode
}

export function SidebarCard({ title, children }: Props) {
  return (
    <div className="bg-stone-100 dark:bg-neutral-900 rounded-xl">
      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-300">{title}</p>
      </div>
      <div className="px-4 pb-3">{children}</div>
    </div>
  )
}

export function SidebarRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{label}</span>
      <span className="text-xs font-normal text-slate-500 dark:text-slate-400 text-right">{value}</span>
    </div>
  )
}
