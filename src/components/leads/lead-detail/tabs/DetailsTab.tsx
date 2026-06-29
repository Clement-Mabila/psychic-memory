import { MapPin, Globe, Phone, Users, DollarSign, Activity, Briefcase, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { InfoRow, SelectRow } from '../shared/FieldRow'
import { scoreTextColour } from '../utils'
import { VERTICALS, STAGES } from '../constants'
import type { Draft } from '../types'

interface Props {
  lead: any
  editing: boolean
  draft: Draft | null
  setField: (k: keyof Draft) => (v: string) => void
}

export function DetailsTab({ lead, editing, draft, setField }: Props) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Company Details</h3>

      <div className="border border-gray-100 dark:border-neutral-800 rounded-xl px-5 py-2 mb-4">
        {editing && draft ? (
          <>
            <SelectRow icon={Activity}   label="Stage"          value={draft.lifecycle_stage} options={STAGES.map(s => ({ value: s, label: s.replace(/_/g, ' ') }))} editing onChange={setField('lifecycle_stage')} />
            <SelectRow icon={Briefcase}  label="Vertical"       value={draft.vertical} options={VERTICALS.map(v => ({ value: v, label: v.charAt(0).toUpperCase() + v.slice(1) }))} editing onChange={setField('vertical')} />
            <InfoRow   icon={MapPin}     label="City"           value={draft.hq_city}        editing onChange={setField('hq_city')}        placeholder="e.g. Peterborough" />
            <InfoRow   icon={MapPin}     label="Province/State" value={draft.hq_state}       editing onChange={setField('hq_state')}       placeholder="e.g. ON" />
            <InfoRow   icon={Globe}      label="Country"        value={draft.hq_country}     editing onChange={setField('hq_country')}     placeholder="e.g. CA" />
            <InfoRow   icon={Phone}      label="HQ Phone"       value={draft.hq_phone}       editing onChange={setField('hq_phone')}       placeholder="+1 ..." />
            <InfoRow   icon={Users}      label="Employees"      value={draft.employee_count} editing onChange={setField('employee_count')} type="number" placeholder="e.g. 500" />
            <InfoRow   icon={DollarSign} label="Revenue"        value={draft.revenue_range}  editing onChange={setField('revenue_range')}  placeholder="e.g. $50M–$100M" />
            <SelectRow icon={DollarSign} label="Currency"       value={draft.currency} options={[{ value: 'CAD', label: 'CAD' }, { value: 'USD', label: 'USD' }]} editing onChange={setField('currency')} />
          </>
        ) : (
          <>
            <InfoRow icon={Activity}   label="Stage"          value={lead.lifecycle_stage?.replace(/_/g, ' ')} editing={false} onChange={() => {}} />
            <InfoRow icon={Briefcase}  label="Vertical"       value={lead.vertical}        editing={false} onChange={() => {}} />
            <InfoRow icon={MapPin}     label="City"           value={lead.hq_city}         editing={false} onChange={() => {}} />
            <InfoRow icon={MapPin}     label="Province/State" value={lead.hq_state}        editing={false} onChange={() => {}} />
            <InfoRow icon={Globe}      label="Country"        value={lead.hq_country}      editing={false} onChange={() => {}} />
            <InfoRow icon={Phone}      label="HQ Phone"       value={lead.hq_phone}        editing={false} onChange={() => {}} />
            <InfoRow icon={Users}      label="Employees"      value={lead.employee_count}  editing={false} onChange={() => {}} />
            <InfoRow icon={DollarSign} label="Revenue"        value={lead.revenue_range}   editing={false} onChange={() => {}} />
            <InfoRow icon={DollarSign} label="Currency"       value={lead.currency}        editing={false} onChange={() => {}} />
          </>
        )}
      </div>

      {lead.corporate_group && (
        <div className="border border-gray-100 dark:border-neutral-800 rounded-xl px-5 py-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={13} className="text-gray-400 dark:text-slate-500" />
            <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
              Corporate Group
            </p>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
              {lead.corporate_group.name}
            </span>
            {lead.is_group_parent && (
              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 px-2 py-0.5 rounded-full">
                Parent
              </span>
            )}
            <span className="text-xs text-gray-400 dark:text-slate-500">
              · {lead.corporate_group.member_count} propert{lead.corporate_group.member_count !== 1 ? 'ies' : 'y'}
            </span>
          </div>
          {lead.subsidiaries?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {lead.subsidiaries.map((s: any) => (
                <span
                  key={s.id}
                  className="text-xs bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-slate-400 px-2.5 py-1 rounded-lg border border-gray-100 dark:border-neutral-700"
                >
                  {s.company_name}
                  {s.qualification_score != null && (
                    <span className={cn('ml-1.5 font-semibold', scoreTextColour(s.qualification_score))}>
                      {s.qualification_score}
                    </span>
                  )}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
