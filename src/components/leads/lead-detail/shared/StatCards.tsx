import { Users, Star, Earth, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StatCards({ lead, contacts }: { lead: any; contacts: any[] }) {

  const stats = [
    {
      Icon: Users, iconBg: 'bg-blue-50 dark:bg-blue-950/40', iconColor: 'text-blue-500',
      label: 'Total Contacts',
      value: String(contacts.length),
    },
    {
      Icon: Earth, iconBg: 'bg-purple-50 dark:bg-purple-950/40', iconColor: 'text-purple-500',
      label: 'Total Employees',
      value: lead.employee_count ? lead.employee_count.toLocaleString() : '—',
    },
    {
      Icon: Calendar, iconBg: 'bg-emerald-50 dark:bg-emerald-950/40', iconColor: 'text-emerald-500',
      label: 'Revenue',
      value: lead.revenue_range ?? '—',
    },
    {
      Icon: Star, iconBg: 'bg-amber-50 dark:bg-amber-950/40', iconColor: 'text-amber-500',
      label: 'Overall Rating',
      value: lead.qualification_score != null ? String(lead.qualification_score) : '—',
    },
  ]

  return (
    <div className="grid grid-cols-4 divide-x divide-gray-100 dark:divide-neutral-800 border border-gray-100 dark:border-neutral-800 rounded-xl mb-6 overflow-hidden">
      {stats.map(({ Icon, iconBg, iconColor, label, value }) => (
        <div key={label} className="px-4 py-3 flex flex-col gap-1.5">
          <div className={cn('w-6 h-6 rounded-lg flex items-center justify-center', iconBg)}>
            <Icon className={cn('h-3.5 w-3.5', iconColor)} />
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 leading-tight">{label}</span>
          <p className="text-sm font-semibold leading-none text-slate-900 dark:text-slate-100">
            {value}
          </p>
        </div>
      ))}
    </div>
  )
}
