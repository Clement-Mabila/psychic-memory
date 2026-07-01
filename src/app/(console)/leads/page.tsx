'use client'

import { useState, useRef, useEffect, type ReactNode } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronLeft, ChevronRight,
  Search, LayoutGrid, Table2, Network,
  ListFilter, Check, X, PlusCircle,
  EyeOff, Eye, MoreVertical, Info,
  ChevronDown, Trash2, Plus, BadgeInfo,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import api from '@/lib/api'
import LeadCard from '@/components/leads/LeadCard'
import LeadTable from '@/components/leads/LeadTable'
import GroupPickerModal from '@/components/leads/GroupPickerModal'
import PortfolioDiscoveryModal from '@/components/leads/PortfolioDiscoveryModal'
import GroupKanbanView from '@/components/leads/GroupKanbanView'
import GroupTableView from '@/components/leads/GroupTableView'
import CreateGroupModal from '@/components/leads/CreateGroupModal'
import LeadDetailModal from '@/components/leads/LeadDetailModal'

const STAGES = [
  'raw_signal','discovery','research','contact',
  'enrichment','qualification','sql','mql','needs_review','disqualified',
]
const VERTICALS = ['casino','airport','hospital','transit','mall']

const RERUN_OPTIONS = [
  { value: 'research',      label: 'Re-run from Research' },
  { value: 'contact',       label: 'Re-run from Contact' },
  { value: 'enrichment',    label: 'Re-run from Enrichment' },
  { value: 'qualification', label: 'Re-run Qualification only' },
]

type ViewMode = 'kanban' | 'table' | 'groups'

const VIEW_TABS: { id: ViewMode; label: string; Icon: any }[] = [
  { id: 'kanban', label: 'Kanban', Icon: LayoutGrid },
  { id: 'table',  label: 'Table',  Icon: Table2 },
  { id: 'groups', label: 'Groups', Icon: Network },
]

// ─── Collapsible search ──────────────────────────────────────────────────────
function CollapsibleSearch({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef   = useRef<HTMLInputElement>(null)

  const expand = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
    setExpanded(true)
    setTimeout(() => inputRef.current?.focus(), 0)
  }
  const handleBlur = () => {
    closeTimer.current = setTimeout(() => { setExpanded(false); onChange(''); closeTimer.current = null }, 5000)
  }
  const handleFocus = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
  }

  if (!expanded) {
    return (
      <button onClick={expand} className="h-9 w-9 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
        <Search className="h-4 w-4 text-slate-600 dark:text-slate-400" />
      </button>
    )
  }
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
      <input
        ref={inputRef}
        placeholder="Search company or domain…"
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={handleBlur}
        onFocus={handleFocus}
        className="w-64 pl-9 pr-3 h-10 text-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-700 focus:border-slate-300 dark:focus:border-slate-600 rounded-full placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-600 dark:text-slate-300 outline-none"
      />
    </div>
  )
}

// ─── Compound filter builder ──────────────────────────────────────────────────
type FilterRule = { id: string; field: string; operator: string; value: string }

function rulesToParams(rules: FilterRule[]): Record<string, string> {
  const p: Record<string, string> = {}
  const mv = (field: string, op: string) => rules.filter(r => r.field === field && r.operator === op && r.value).map(r => r.value)

  const si = mv('stage',        'is');     if (si.length)  p.stage        = si.join(',')
  const sn = mv('stage',        'is_not'); if (sn.length)  p.stage_not    = sn.join(',')
  const vi = mv('vertical',     'is');     if (vi.length)  p.vertical     = vi.join(',')
  const vn = mv('vertical',     'is_not'); if (vn.length)  p.vertical_not = vn.join(',')
  const pi = mv('priority_tier','is');     if (pi.length)  p.priority_tier = pi.join(',')
  const ci = mv('hq_country',  'is');     if (ci.length)  p.hq_country   = ci.join(',')

  for (const r of rules) {
    if (!r.field || !r.operator) continue
    const needsValue = !['has_group','has_phone','has_crm','casl_compliant'].includes(r.field)
    if (needsValue && !r.value) continue
    switch (r.field) {
      case 'hq_state':           if (!p.hq_state)    p.hq_state    = r.value; break
      case 'hq_city':            if (!p.hq_city)     p.hq_city     = r.value; break
      case 'industry':           if (!p.industry)    p.industry    = r.value; break
      case 'employee_count':
        if (r.operator === 'gt') p.min_employees = r.value
        else if (r.operator === 'lt') p.max_employees = r.value
        else { p.min_employees = r.value; p.max_employees = r.value }
        break
      case 'qualification_score': r.operator === 'gt' ? (p.min_score = r.value) : (p.max_score = r.value); break
      case 'has_group':           p.has_corporate_group = r.operator === 'has' ? 'true' : 'false'; break
      case 'has_phone':           p.has_phone = r.operator === 'has' ? 'true' : 'false'; break
      case 'has_crm':             p.has_crm = r.operator === 'has' ? 'true' : 'false'; break
      case 'source':              if (!p.source)   p.source   = r.value; break
      case 'currency':            if (!p.currency) p.currency = r.value; break
      case 'casl_compliant':      p.casl_compliant = r.operator === 'is_true' ? 'true' : 'false'; break
      case 'hipaa_baa_status':    if (!p.hipaa_baa_status) p.hipaa_baa_status = r.value; break
    }
  }
  return p
}

// ─── Filter field schema ──────────────────────────────────────────────────────
type FOpt    = { value: string; label: string }
type FieldDef = { value: string; label: string; operators: FOpt[]; valueOptions: FOpt[] | null }

const DEFAULT_FILTER_RULES: FilterRule[] = [
  { id: 'default-1', field: 'stage',         operator: 'is', value: '' },
  { id: 'default-2', field: 'vertical',       operator: 'is', value: '' },
  { id: 'default-3', field: 'priority_tier',  operator: 'is', value: '' },
  { id: 'default-4', field: 'hq_country',    operator: 'is', value: '' },
]

const FILTER_FIELD_DEFS: FieldDef[] = [
  { value: 'stage',              label: 'Stage',           operators: [{ value: 'is', label: 'is' }, { value: 'is_not', label: 'is not' }],                   valueOptions: [{ value: 'raw_signal', label: 'Raw Signal' }, { value: 'discovery', label: 'Discovery' }, { value: 'research', label: 'Research' }, { value: 'contact', label: 'Contact' }, { value: 'enrichment', label: 'Enrichment' }, { value: 'qualification', label: 'Qualification' }, { value: 'sql', label: 'SQL' }, { value: 'mql', label: 'MQL' }, { value: 'needs_review', label: 'Needs Review' }, { value: 'disqualified', label: 'Disqualified' }] },
  { value: 'vertical',           label: 'Vertical',        operators: [{ value: 'is', label: 'is' }, { value: 'is_not', label: 'is not' }],                   valueOptions: [{ value: 'casino', label: 'Casino' }, { value: 'airport', label: 'Airport' }, { value: 'hospital', label: 'Hospital' }, { value: 'transit', label: 'Transit' }, { value: 'mall', label: 'Mall' }] },
  { value: 'priority_tier',      label: 'Priority',        operators: [{ value: 'is', label: 'is' }],                                                          valueOptions: [{ value: 'hot', label: 'Hot' }, { value: 'warm', label: 'Warm' }, { value: 'standard', label: 'Standard' }] },
  { value: 'hq_country',         label: 'Country',         operators: [{ value: 'is', label: 'is' }],                                                          valueOptions: [{ value: 'US', label: 'United States' }, { value: 'CA', label: 'Canada' }, { value: 'GB', label: 'United Kingdom' }, { value: 'AU', label: 'Australia' }, { value: 'NZ', label: 'New Zealand' }, { value: 'IE', label: 'Ireland' }] },
  { value: 'industry',           label: 'Industry',        operators: [{ value: 'contains', label: 'contains' }],                                              valueOptions: [{ value: 'gaming', label: 'Gaming' }, { value: 'hospitality', label: 'Hospitality' }, { value: 'healthcare', label: 'Healthcare' }, { value: 'transportation', label: 'Transportation' }, { value: 'retail', label: 'Retail' }, { value: 'technology', label: 'Technology' }, { value: 'finance', label: 'Finance' }, { value: 'real estate', label: 'Real Estate' }] },
  { value: 'employee_count',     label: 'Employees',       operators: [{ value: 'gt', label: 'more than' }, { value: 'lt', label: 'less than' }],              valueOptions: [{ value: '10', label: '10' }, { value: '50', label: '50' }, { value: '100', label: '100' }, { value: '250', label: '250' }, { value: '500', label: '500' }, { value: '1000', label: '1,000' }, { value: '5000', label: '5,000' }] },
  { value: 'qualification_score',label: 'Score',           operators: [{ value: 'gt', label: 'above' }, { value: 'lt', label: 'below' }],                     valueOptions: [{ value: '30', label: '30' }, { value: '50', label: '50' }, { value: '60', label: '60' }, { value: '70', label: '70' }, { value: '80', label: '80' }, { value: '90', label: '90' }] },
  { value: 'source',             label: 'Lead Source',     operators: [{ value: 'is', label: 'is' }],                                                          valueOptions: [{ value: 'signal', label: 'Signal' }, { value: 'apollo_discovery', label: 'Apollo' }, { value: 'manual', label: 'Manual' }] },
  { value: 'currency',           label: 'Currency',        operators: [{ value: 'is', label: 'is' }],                                                          valueOptions: [{ value: 'USD', label: 'USD ($)' }, { value: 'CAD', label: 'CAD ($)' }, { value: 'GBP', label: 'GBP (£)' }, { value: 'AUD', label: 'AUD ($)' }] },
  { value: 'has_group',          label: 'Corporate Group', operators: [{ value: 'has', label: 'has group' }, { value: 'has_not', label: 'has no group' }],     valueOptions: null },
  { value: 'has_phone',          label: 'Phone',           operators: [{ value: 'has', label: 'has phone' }, { value: 'has_not', label: 'no phone' }],         valueOptions: null },
  { value: 'has_crm',            label: 'HubSpot CRM',     operators: [{ value: 'has', label: 'connected' }, { value: 'has_not', label: 'not connected' }],   valueOptions: null },
  { value: 'casl_compliant',     label: 'CASL Compliant',  operators: [{ value: 'is_true', label: 'is compliant' }, { value: 'is_false', label: 'not compliant' }], valueOptions: null },
]

// ─── Custom dropdown ──────────────────────────────────────────────────────────
function FDropdown({ options, value, onChange, placeholder = 'Select…', minWidth = 'min-w-[110px]' }: {
  options: FOpt[]; value: string; onChange: (v: string) => void; placeholder?: string; minWidth?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = options.find(o => o.value === value)

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={cn(
          'flex items-center justify-between gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors',
          minWidth,
          open
            ? 'border-blue-400 dark:border-blue-500 bg-white dark:bg-zinc-800 text-slate-800 dark:text-slate-200 ring-2 ring-blue-500/10'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
        )}
      >
        <span className="truncate">
          {selected ? selected.label : <span className="text-slate-400 dark:text-slate-500">{placeholder}</span>}
        </span>
        <ChevronDown className="h-3 w-3 shrink-0 text-slate-400 dark:text-slate-500" />
      </button>

      {open && (
        <div className="absolute left-0 z-[60] mt-1 w-max min-w-full max-w-[220px] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 py-1 shadow-lg dark:shadow-black/40">
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors',
                opt.value === value
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-700'
              )}
            >
              <span className="w-3 h-3 shrink-0 flex items-center justify-center">
                {opt.value === value && <Check className="h-3 w-3 text-blue-500" />}
              </span>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}


// ─── Filter builder ───────────────────────────────────────────────────────────
function FilterBuilder({ rules, onChange }: { rules: FilterRule[]; onChange: (r: FilterRule[]) => void }) {
  const [open,     setOpen]     = useState(false)
  const [advanced, setAdvanced] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setAdvanced(false) }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isComplete = (r: FilterRule) => {
    if (!r.field || !r.operator) return false
    const def = FILTER_FIELD_DEFS.find(d => d.value === r.field)
    return def?.valueOptions === null || !!r.value
  }
  const activeCount = rules.filter(isComplete).length
  const clearAll    = () => onChange(DEFAULT_FILTER_RULES.map(r => ({ ...r, id: Math.random().toString(36).slice(2) })))

  // ── Simple mode helpers ────────────────────────────────────────────────────
  const isPillActive = (field: string, value: string) =>
    rules.some(r => r.field === field && r.operator === 'is' && r.value === value)
  const isBoolActive = (field: string, op: string) => rules.some(r => r.field === field && r.operator === op)

  const togglePill = (field: string, value: string) => {
    const match = rules.find(r => r.field === field && r.operator === 'is' && r.value === value)
    if (match) {
      const otherActive = rules.filter(r => r.id !== match.id && r.field === field && r.value !== '')
      if (otherActive.length === 0) {
        onChange(rules.map(r => r.id === match.id ? { ...r, value: '' } : r))
      } else {
        onChange(rules.filter(r => r.id !== match.id))
      }
    } else {
      const empty = rules.find(r => r.field === field && r.operator === 'is' && r.value === '')
      if (empty) {
        onChange(rules.map(r => r.id === empty.id ? { ...r, value } : r))
      } else {
        onChange([...rules, { id: Math.random().toString(36).slice(2), field, operator: 'is', value }])
      }
    }
  }

  const toggleBool = (field: string, op: string) => {
    const existing = rules.find(r => r.field === field)
    if (existing?.operator === op) { onChange(rules.filter(r => r.field !== field)); return }
    onChange([...rules.filter(r => r.field !== field), { id: Math.random().toString(36).slice(2), field, operator: op, value: '' }])
  }

  const chip = (active: boolean) => cn(
    'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-normal border transition-all cursor-pointer select-none',
    active
      ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300'
      : 'border-zinc-100 dark:border-slate-700 bg-white dark:bg-zinc-800 text-slate-600 dark:text-slate-400 hover:border-gray-300 dark:hover:border-slate-600'
  )

  // ── Advanced mode helpers ──────────────────────────────────────────────────
  const addRule = () => {
    const def = FILTER_FIELD_DEFS[0]
    onChange([...rules, { id: Math.random().toString(36).slice(2), field: def.value, operator: def.operators[0].value, value: '' }])
  }
  const removeRule    = (id: string) => onChange(rules.filter(r => r.id !== id))
  const updateField   = (id: string, field: string) => { const def = FILTER_FIELD_DEFS.find(d => d.value === field); onChange(rules.map(r => r.id !== id ? r : { ...r, field, operator: def?.operators[0].value ?? 'is', value: '' })) }
  const updateOperator = (id: string, operator: string) => onChange(rules.map(r => r.id !== id ? r : { ...r, operator }))
  const updateValue   = (id: string, value: string)    => onChange(rules.map(r => r.id !== id ? r : { ...r, value }))

  const RuleRow = ({ rule, prefix }: { rule: FilterRule; prefix?: ReactNode }) => {
    const def = FILTER_FIELD_DEFS.find(d => d.value === rule.field)
    return (
      <div className="flex items-center gap-2">
        {prefix}
        <FDropdown options={FILTER_FIELD_DEFS.map(d => ({ value: d.value, label: d.label }))} value={rule.field} onChange={v => updateField(rule.id, v)} minWidth="min-w-[120px]" />
        {def && <FDropdown options={def.operators} value={rule.operator} onChange={v => updateOperator(rule.id, v)} minWidth="min-w-[100px]" />}
        {def?.valueOptions && <FDropdown options={def.valueOptions} value={rule.value} onChange={v => updateValue(rule.id, v)} placeholder="Select…" minWidth="min-w-[120px]" />}
        <button onClick={() => removeRule(rule.id)} className="ml-auto rounded-md p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  const topRule      = rules[0]
  const cardRules    = rules.slice(1)
  const bracketRules = cardRules.slice(1)

  const divider = <div className="border-b border-slate-100 dark:border-slate-800" />
  const lbl     = 'text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2'

  return (
    <div className="relative" ref={ref}>
      {/* Filter icon button */}
      <button
        onClick={() => setOpen(p => !p)}
        className={cn(
          'relative h-9 w-9 rounded-2xl border flex items-center justify-center transition-colors',
          open
            ? 'bg-slate-900 dark:bg-zinc-700 border-slate-900 dark:border-slate-700 text-white'
            : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
        )}
      >
        <ListFilter className="h-4 w-4" />
        {activeCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {activeCount}
          </span>
        )}
      </button>

      {/* ── Simple filter panel ─────────────────────────────────────────────── */}
      {open && !advanced && (() => {
        const allChips: { key: string; label: string; dot?: string; onClick: () => void; active: boolean }[] = [
          { key: 'raw_signal',    label: 'Prospecting',       dot: 'text-slate-500',  onClick: () => togglePill('stage', 'raw_signal'),    active: isPillActive('stage', 'raw_signal')    },
          { key: 'qualification', label: 'Qualifying To Buy',  dot: 'text-orange-500', onClick: () => togglePill('stage', 'qualification'), active: isPillActive('stage', 'qualification') },
          { key: 'sql',           label: 'Sales Qualified',    dot: 'text-cyan-500',   onClick: () => togglePill('stage', 'sql'),           active: isPillActive('stage', 'sql')           },
          { key: 'mql',           label: 'Market Qualified',   dot: 'text-violet-500', onClick: () => togglePill('stage', 'mql'),           active: isPillActive('stage', 'mql')           },
          { key: 'needs_review',  label: 'Pending Review',     dot: 'text-amber-500',  onClick: () => togglePill('stage', 'needs_review'),  active: isPillActive('stage', 'needs_review')  },
          { key: 'disqualified',  label: 'Unqualified To Buy', dot: 'text-red-500',    onClick: () => togglePill('stage', 'disqualified'),  active: isPillActive('stage', 'disqualified')  },
          { key: 'casino',        label: 'Casino',        onClick: () => togglePill('vertical', 'casino'),     active: isPillActive('vertical', 'casino')     },
          { key: 'airport',       label: 'Airport',       onClick: () => togglePill('vertical', 'airport'),    active: isPillActive('vertical', 'airport')    },
          { key: 'hospital',      label: 'Hospital',      onClick: () => togglePill('vertical', 'hospital'),   active: isPillActive('vertical', 'hospital')   },
          { key: 'transit',       label: 'Transit',       onClick: () => togglePill('vertical', 'transit'),    active: isPillActive('vertical', 'transit')    },
          { key: 'mall',          label: 'Mall',          onClick: () => togglePill('vertical', 'mall'),       active: isPillActive('vertical', 'mall')       },
          { key: 'hot',           label: 'Hot',           onClick: () => togglePill('priority_tier', 'hot'),   active: isPillActive('priority_tier', 'hot')   },
          { key: 'warm',          label: 'Warm',          onClick: () => togglePill('priority_tier', 'warm'),  active: isPillActive('priority_tier', 'warm')  },
          { key: 'standard',      label: 'Standard',      onClick: () => togglePill('priority_tier', 'standard'), active: isPillActive('priority_tier', 'standard') },
          { key: 'has_phone',     label: 'Has Phone',     onClick: () => toggleBool('has_phone', 'has'),       active: isBoolActive('has_phone', 'has')       },
          { key: 'in_hubspot',    label: 'In HubSpot',    onClick: () => toggleBool('has_crm', 'has'),         active: isBoolActive('has_crm', 'has')         },
        ]
        return (
          <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[340px] bg-white dark:bg-neutral-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl dark:shadow-black/40 p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Companies & Filters</p>
                <p className="text-xs font-normal text-slate-600 dark:text-slate-500 mt-0.5">Select to filter leads</p>
              </div>
              {activeCount > 0 && (
                <button onClick={clearAll} className="flex items-center gap-0.5 text-xs font-medium text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors mt-1">
                  {activeCount} selected <ChevronDown className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Flat chip grid */}
            <div className="flex flex-wrap gap-2">
              {allChips.map(({ key, label, dot, onClick, active }) => (
                <button key={key} onClick={onClick} className={chip(active)}>
                  {active && <Check className="h-3 w-3" />}
                  {dot && <BadgeInfo className={cn('h-3 w-3 flex-shrink-0', dot)} />}
                  {label}
                </button>
              ))}
            </div>

            {/* Advanced link */}
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setAdvanced(true)}
                className="flex items-center gap-1 text-xs font-normal text-slate-600 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                Advanced Filters <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── Advanced filter panel ───────────────────────────────────────────── */}
      {open && advanced && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-[560px] bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl dark:shadow-black/40 p-5">

          {/* Back link */}
          <button
            onClick={() => setAdvanced(false)}
            className="flex items-center gap-1 text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors mb-4"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Simple Filters
          </button>

          {/* Top-level "Where" row */}
          {topRule && (
            <RuleRow rule={topRule} prefix={<span className="text-sm font-medium text-slate-500 dark:text-slate-400 w-14 shrink-0">Where:</span>} />
          )}

          {/* And + nested card */}
          {cardRules.length > 0 && (
            <div className="mt-3 flex gap-3">
              <div className="flex flex-col items-center w-14 shrink-0">
                <span className="rounded-full border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap select-none">
                  And
                </span>
                <div className="mt-1 flex-1 w-px bg-slate-200 dark:bg-slate-700" />
              </div>
              <div className="flex-1 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-100 dark:border-slate-800 p-3">
                <div className="space-y-2">
                  <RuleRow rule={cardRules[0]} prefix={<span className="text-sm font-medium text-slate-500 dark:text-slate-400 w-14 shrink-0">Where:</span>} />
                  {bracketRules.length > 0 && (
                    <div className="flex gap-2">
                      <div className="flex flex-col items-center w-6 shrink-0">
                        <div className="flex-1 w-3 border-b border-l border-slate-300 dark:border-slate-600 rounded-bl" />
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900 text-[10px] font-medium text-slate-400 dark:text-slate-500">&amp;</span>
                        <div className="flex-1 w-3 border-t border-l border-slate-300 dark:border-slate-600 rounded-tl" />
                      </div>
                      <div className="flex-1 space-y-2">
                        {bracketRules.map(rule => <RuleRow key={rule.id} rule={rule} />)}
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <button onClick={addRule} className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors">
                    <Plus className="h-3.5 w-3.5" /> Add another
                  </button>
                  {activeCount > 0 && (
                    <button onClick={clearAll} className="text-xs font-medium text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                      Clear filters
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4">
            {cardRules.length === 0 && (
              <button onClick={addRule} className="flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors">
                <Plus className="h-3.5 w-3.5" /> Add filter
              </button>
            )}
            <div className="flex-1" />
            <button onClick={clearAll} className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
              Clear all
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Collapsed column stub ───────────────────────────────────────────────────
function CollapsedColumnStub({
  col, count, onShow,
}: {
  col: { id: string; label: string; colour: string; textColour: string }
  count: number
  onShow: () => void
}) {
  return (
    <div className="flex-shrink-0 w-10 flex flex-col items-center gap-2 pt-1">
      <button
        onClick={onShow}
        title={`Show ${col.label}`}
        className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
      >
        <Eye size={14} />
      </button>
      <span className="text-xs text-slate-400 dark:text-slate-500">{count}</span>
      <div className="relative group flex items-center justify-center flex-1 cursor-pointer" onClick={onShow}>
        <Info size={13} className={col.textColour} />
        <div className="absolute left-full ml-2 hidden group-hover:block z-50 whitespace-nowrap bg-gray-900 dark:bg-neutral-800 text-white text-xs rounded-md px-2 py-1 pointer-events-none">
          {col.label}
        </div>
      </div>
      <span className={cn('w-2 h-2 rounded-full flex-shrink-0', col.colour)} />
    </div>
  )
}

// ─── Kanban column config ────────────────────────────────────────────────────
const KANBAN_COLUMNS: { id: string; label: string; dealLabel: string; colour: string; textColour: string }[] = [
  { id: 'raw_signal',    label: 'Raw Signal',       dealLabel: 'Prospecting',        colour: 'bg-gray-400',    textColour: 'text-slate-400'   },
  { id: 'qualification', label: 'Qualification',    dealLabel: 'Qualifying To Buy',         colour: 'bg-orange-500',  textColour: 'text-orange-400' },
  { id: 'sql',           label: 'SQL',              dealLabel: 'Sales Qualified',    colour: 'bg-cyan-600', textColour: 'text-emerald-500'},
  { id: 'mql',           label: 'MQL',              dealLabel: 'Market Qualified', colour: 'bg-violet-600',  textColour: 'text-violet-500' },
  { id: 'needs_review',  label: 'Needs Review',     dealLabel: 'Pending Review',     colour: 'bg-amber-600',  textColour: 'text-yellow-400' },
  { id: 'disqualified',  label: 'Disqualified',     dealLabel: 'Unqualified To Buy',        colour: 'bg-red-500',     textColour: 'text-red-400'    },
]

// ─── Kanban scrollable column ────────────────────────────────────────────────
function KanbanColumn({
  col, leads, loading,
  runStatus, onRun, onRerun, onRunOnly, isPendingRun, selected, onSelect, onOpen, onSetGroup,
  cardStyle, onHide,
}: {
  col: { id: string; label: string; dealLabel: string; colour: string; textColour: string }
  leads: any[]
  loading: boolean
  runStatus: Record<string, string>
  onRun: (id: string) => void
  onRerun: (id: string, from: string) => void
  onRunOnly: (id: string, agentType: string) => void
  isPendingRun: (id: string) => boolean
  selected: Set<string>
  onSelect: (id: string) => void
  onOpen: (id: string) => void
  onSetGroup: (id: string) => void
  cardStyle?: 'technical' | 'non-technical'
  onHide: () => void
}) {
  const [limit, setLimit] = useState(15)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef     = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const scrollRef   = useRef<HTMLDivElement>(null)

  const visibleLeads = leads.slice(0, limit)
  const hasMore = leads.length > limit

  useEffect(() => { setLimit(15) }, [leads])

  useEffect(() => {
    const sentinel = sentinelRef.current
    const root     = scrollRef.current
    if (!sentinel || !root || !hasMore) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setLimit(prev => Math.min(prev + 25, leads.length))
      },
      { root, threshold: 0.1 },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, leads.length])

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  return (
    <div className={cn(
      cardStyle === 'non-technical' ? 'flex-shrink-0 w-[280px]' : 'flex-shrink-0 w-[260px]',
      cardStyle === 'non-technical' && 'bg-zinc-200 dark:bg-zinc-800/50 rounded-2xl p-3'
    )}>
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3">
        {cardStyle === 'non-technical' ? (
          <span className={cn('px-3 py-0.5 rounded-full text-white text-xs font-bold tracking-wide', col.colour)}>
            {col.dealLabel}
          </span>
        ) : (
          <>
            <span className={cn('w-2 h-2 rounded-full', col.colour)} />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{col.label}</span>
          </>
        )}
        <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">{leads.length}</span>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <MoreVertical size={14} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl shadow-md z-20">
              <button
                onClick={() => { setMenuOpen(false); onHide() }}
                className="w-full text-left px-3 py-2 text-xs text-slate-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl flex items-center gap-2"
              >
                <EyeOff size={11} /> Hide column
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable card list + bottom fade */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex flex-col gap-3 overflow-y-auto"
          style={{ maxHeight: 'calc(100vh - 200px)' }}
        >
          {loading ? (
            <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 animate-pulse h-32" />
          ) : visibleLeads.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-2xl p-4 text-center text-xs text-slate-400 dark:text-slate-500">
              No leads
            </div>
          ) : (
            <>
              {visibleLeads.map(lead => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  runStatus={runStatus[lead.id]}
                  isRunning={isPendingRun(lead.id)}
                  onRun={onRun}
                  onRerun={onRerun}
                  onRunOnly={onRunOnly}
                  selected={selected.has(lead.id)}
                  onSelect={onSelect}
                  onOpen={onOpen}
                  onSetGroup={onSetGroup}
                  cardStyle={cardStyle}
                />
              ))}
              {hasMore && (
                <div ref={sentinelRef} className="h-6 flex items-center justify-center shrink-0">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{leads.length - limit} more</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Fade gradient when more cards are below the scroll viewport */}
        {hasMore && (
          <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-gray-50 dark:from-slate-950 to-transparent pointer-events-none" />
        )}
      </div>
    </div>
  )
}

export default function LeadsPage() {
  const qc = useQueryClient()
  const searchParams = useSearchParams()

  const [view,          setView]          = useState<ViewMode>((searchParams.get('view') as ViewMode) ?? 'kanban')
  const [groupViewMode, setGroupViewMode] = useState<'kanban' | 'table'>('kanban')
  const [search,      setSearch]      = useState('')
  const [filterRules, setFilterRules] = useState<FilterRule[]>(DEFAULT_FILTER_RULES)
  const [page,        setPage]        = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [runStatus, setRunStatus] = useState<Record<string, string>>({})
  const [groupPickerLeadId,  setGroupPickerLeadId]  = useState<string | null>(null)
  const [showPortfolioModal, setShowPortfolioModal] = useState(false)
  const [showCreateGroup,    setShowCreateGroup]     = useState(false)
  const [detailLeadId,       setDetailLeadId]        = useState<string | null>(null)
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set())

  const filterParams = rulesToParams(filterRules)

  const { data, isLoading } = useQuery({
    queryKey: ['leads', search, filterParams, page],
    queryFn: () =>
      api.get('/leads/', { params: { search, ...filterParams, page } }).then(r => r.data),
    placeholderData: prev => prev,
    enabled: view !== 'kanban',
    staleTime: 30_000,
  })

  const { data: kanbanData, isLoading: kanbanLoading } = useQuery({
    queryKey: ['leads-kanban', search, filterParams],
    queryFn: () =>
      api.get('/leads/', { params: { search, ...filterParams, page_size: 500, page: 1 } }).then(r => r.data),
    placeholderData: prev => prev,
    enabled: view === 'kanban',
    staleTime: 30_000,
  })

  const leads: any[] = data?.leads ?? []
  const kanbanLeads: any[] = kanbanData?.leads ?? []

  const clearStatus = (id: string) =>
    setTimeout(() => setRunStatus(s => { const n = { ...s }; delete n[id]; return n }), 8000)

  const runMutation = useMutation({
    mutationFn: (leadId: string) => api.post(`/leads/${leadId}/run/`),
    onSuccess: (res, leadId) => {
      setRunStatus(s => ({ ...s, [leadId]: `Dispatched → ${res.data.dispatched}` }))
      clearStatus(leadId)
    },
    onError: (_, leadId) => {
      setRunStatus(s => ({ ...s, [leadId]: 'Error' }))
      clearStatus(leadId)
    },
  })

  const rerunMutation = useMutation({
    mutationFn: ({ leadId, from }: { leadId: string; from: string }) =>
      api.post(`/leads/${leadId}/rerun/`, { from }),
    onSuccess: (res, { leadId }) => {
      setRunStatus(s => ({ ...s, [leadId]: `Re-running from ${res.data.from}` }))
      clearStatus(leadId)
    },
  })

  const runOnlyMutation = useMutation({
    mutationFn: ({ leadId, agentType }: { leadId: string; agentType: string }) =>
      api.post(`/leads/${leadId}/run_only/`, { agent_type: agentType }),
    onSuccess: (res, { leadId }) => {
      setRunStatus(s => ({ ...s, [leadId]: `Running ${res.data.agent_type} only…` }))
      clearStatus(leadId)
    },
    onError: (_, { leadId }) => {
      setRunStatus(s => ({ ...s, [leadId]: 'Error' }))
      clearStatus(leadId)
    },
  })

  const bulkMutation = useMutation({
    mutationFn: (action: string) =>
      api.post('/leads/bulk/', { lead_ids: Array.from(selected), action }),
    onSuccess: res => {
      alert(`Dispatched ${res.data.dispatched} leads`)
      setSelected(new Set())
    },
  })

  const toggleSelect = (id: string) =>
    setSelected(s => {
      const n = new Set(s)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })

  const toggleAll = (checked: boolean) =>
    setSelected(checked ? new Set(leads.map((l: any) => l.id)) : new Set())

  // Group leads by stage for Kanban — uses its own full dataset, not the paginated table slice
  const byStage = KANBAN_COLUMNS.reduce<Record<string, any[]>>((acc, col) => {
    acc[col.id] = kanbanLeads.filter(l => l.lifecycle_stage === col.id)
    return acc
  }, {})

  return (
    <div className="p-7">
      {/* Header */}

      {/* View switcher + filters row — matches image exactly */}
      <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
        {/* Left: view tabs */}
        <div className="flex items-center border-none rounded-xl overflow-hidden  p-0.5 gap-0.5">
          {VIEW_TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors font-normal',
                view === id
                  ? 'bg-gray-100 dark:bg-zinc-800 text-slate-900 dark:text-slate-100'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}

          {view === 'groups' && (
            <>
              <div className="w-px h-5 bg-slate-200 dark:bg-slate-700 mx-1 self-center" />
              {(['kanban', 'table'] as const).map(m => {
                const Icon = m === 'kanban' ? LayoutGrid : Table2
                return (
                  <button
                    key={m}
                    onClick={() => setGroupViewMode(m)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors font-normal',
                      groupViewMode === m
                        ? 'bg-gray-100 dark:bg-zinc-800 text-slate-900 dark:text-slate-100'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                    )}
                  >
                    <Icon size={14} />
                    {m === 'kanban' ? 'Board' : 'Table'}
                  </button>
                )
              })}
            </>
          )}
        </div>

        {/* Right: search + filters */}
        <div className="flex items-center gap-2">
          {view === 'groups' && (
            <button
              onClick={() => setShowCreateGroup(true)}
              title="New Parent Company"
              className="h-9 w-9 rounded-2xl bg-cyan-500 hover:bg-cyan-600 flex items-center justify-center transition-colors"
            >
              <PlusCircle className="h-4 w-4 text-white" />
            </button>
          )}
          <div className="w-px h-5 bg-slate-200 dark:bg-slate-700" />
          <button
            onClick={() => setShowPortfolioModal(true)}
            title="Portfolio Discovery"
            className="h-9 w-9 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <PlusCircle className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          </button>
          <CollapsibleSearch value={search} onChange={v => { setSearch(v); setPage(1) }} />
          <FilterBuilder
            rules={filterRules}
            onChange={rules => { setFilterRules(rules); setPage(1) }}
          />
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl p-3 flex items-center gap-3">
          <span className="text-sm text-indigo-700 dark:text-indigo-400 font-medium">{selected.size} selected</span>
          <div className="flex-1" />
          <select
            className="h-7 px-2 border border-indigo-300 dark:border-indigo-700 rounded-md text-xs text-indigo-700 dark:text-indigo-400 bg-white dark:bg-zinc-900 outline-none"
            id="bulk-action"
          >
            <option value="run">Run pipeline</option>
            {RERUN_OPTIONS.map(o => (
              <option key={o.value} value={`rerun_${o.value}`}>{o.label}</option>
            ))}
          </select>
          <Button
            variant="primary"
            size="sm"
            loading={bulkMutation.isPending}
            onClick={() => {
              const el = document.getElementById('bulk-action') as HTMLSelectElement
              bulkMutation.mutate(el.value)
            }}
          >
            Apply
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Deselect
          </Button>
        </div>
      )}

      {/* ── KANBAN VIEW ──────────────────────────────────────────────────────── */}
      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
          {KANBAN_COLUMNS.map(col => hiddenColumns.has(col.id) ? (
            <CollapsedColumnStub
              key={col.id}
              col={col}
              count={(byStage[col.id] ?? []).length}
              onShow={() => setHiddenColumns(s => { const n = new Set(s); n.delete(col.id); return n })}
            />
          ) : (
            <KanbanColumn
              key={col.id}
              col={col}
              leads={byStage[col.id] ?? []}
              loading={kanbanLoading}
              runStatus={runStatus}
              onRun={id => runMutation.mutate(id)}
              onRerun={(id, from) => rerunMutation.mutate({ leadId: id, from })}
              onRunOnly={(id, agentType) => runOnlyMutation.mutate({ leadId: id, agentType })}
              isPendingRun={id => runMutation.isPending && runMutation.variables === id}
              selected={selected}
              onSelect={toggleSelect}
              onOpen={id => setDetailLeadId(id)}
              onSetGroup={id => setGroupPickerLeadId(id)}
              cardStyle="non-technical"
              onHide={() => setHiddenColumns(s => new Set([...s, col.id]))}
            />
          ))}
        </div>
      )}

      {/* ── TABLE VIEW ───────────────────────────────────────────────────────── */}
      {view === 'table' && (
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900 overflow-hidden">
          <LeadTable
            leads={leads}
            isLoading={isLoading}
            selected={selected}
            onToggleAll={toggleAll}
            onToggleSelect={toggleSelect}
            runStatus={runStatus}
            isRunning={id => runMutation.isPending && runMutation.variables === id}
            onRun={id => runMutation.mutate(id)}
            onRerun={(id, from) => rerunMutation.mutate({ leadId: id, from })}
            onRunOnly={(id, agentType) => runOnlyMutation.mutate({ leadId: id, agentType })}
            onOpen={id => setDetailLeadId(id)}
            onSetGroup={id => setGroupPickerLeadId(id)}
          />
          <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {leads.length} leads{data?.total ? ` of ${data.total}` : ''}
            </span>
            {(data?.total_pages ?? 0) > 1 && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft size={14} />
                </Button>
                <span className="text-xs text-slate-500 dark:text-slate-400 px-2">
                  {page} / {data?.total_pages}
                </span>
                <Button variant="ghost" size="sm" disabled={page >= (data?.total_pages ?? 1)} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight size={14} />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── GROUPS VIEW ──────────────────────────────────────────────────────── */}
      {view === 'groups' && groupViewMode === 'kanban' && (
        <GroupKanbanView
          search={search}
          onOpen={id => setDetailLeadId(id)}
          onSetGroup={id => setGroupPickerLeadId(id)}
        />
      )}
      {view === 'groups' && groupViewMode === 'table' && (
        <GroupTableView
          search={search}
          onOpen={id => setDetailLeadId(id)}
          onSetGroup={id => setGroupPickerLeadId(id)}
        />
      )}

      {/* ── LIST VIEW (kept for data parity, hidden in nav) ───────────────────── */}
      {false && (
        <div className="flex flex-col gap-2">
          {isLoading && (
            <div className="text-sm text-slate-400 dark:text-slate-500 py-8 text-center">Loading…</div>
          )}
          {leads.map(lead => (
            <div
              key={lead.id}
              className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-slate-800 rounded-xl px-4 py-3 flex items-center gap-4 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <input
                type="checkbox"
                checked={selected.has(lead.id)}
                onChange={() => toggleSelect(lead.id)}
                className="cursor-pointer flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{lead.company_name}</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">{lead.domain}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                {lead.vertical && (
                  <span className={cn('text-[11px] font-medium px-2.5 py-0.5 rounded-full', 'bg-gray-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400')}>
                    {lead.vertical}
                  </span>
                )}
                {lead.lifecycle_stage && (
                  <span className={cn('text-[11px] font-medium px-2.5 py-0.5 rounded-full', 'bg-gray-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400')}>
                    {lead.lifecycle_stage.replace(/_/g, ' ')}
                  </span>
                )}
                {lead.qualification_score != null && (
                  <span className={cn(
                    'text-sm font-bold',
                    lead.qualification_score >= 55 ? 'text-emerald-600 dark:text-emerald-400'
                    : lead.qualification_score >= 30 ? 'text-amber-500 dark:text-amber-400'
                    : 'text-red-500 dark:text-red-400'
                  )}>
                    {lead.qualification_score}
                  </span>
                )}
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {lead.modified ? require('@/lib/utils').formatRelativeTime(lead.modified) : '—'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  loading={runMutation.isPending && runMutation.variables === lead.id}
                  onClick={() => runMutation.mutate(lead.id)}
                >
                  Run
                </Button>
              </div>
            </div>
          ))}
          {!isLoading && leads.length === 0 && (
            <div className="text-sm text-slate-400 dark:text-slate-500 py-10 text-center">No leads match your filters</div>
          )}
          {(data?.total_pages ?? 0) > 1 && (
            <div className="flex items-center justify-between px-1 py-2">
              <span className="text-xs text-slate-400 dark:text-slate-500">Showing {leads.length} of {data?.total}</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft size={14} />
                </Button>
                <span className="text-xs text-slate-500 dark:text-slate-400 px-2">Page {page} of {data?.total_pages}</span>
                <Button variant="ghost" size="sm" disabled={page >= (data?.total_pages ?? 1)} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Portfolio discovery modal ────────────────────────────────────────── */}
      {showPortfolioModal && (
        <PortfolioDiscoveryModal onClose={() => setShowPortfolioModal(false)} />
      )}

      {/* ── Create parent company modal ──────────────────────────────────────── */}
      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onCreated={() => setShowCreateGroup(false)}
        />
      )}

      {/* ── Group picker modal ───────────────────────────────────────────────── */}
      {groupPickerLeadId && (() => {
        const allLeads = [...leads, ...kanbanLeads]
        const lead = allLeads.find((l: any) => l.id === groupPickerLeadId)
        return (
          <GroupPickerModal
            leadId={groupPickerLeadId}
            currentGroup={lead?.corporate_group ?? null}
            onClose={() => setGroupPickerLeadId(null)}
            onSaved={() => setGroupPickerLeadId(null)}
          />
        )
      })()}

      {/* ── Lead detail modal ────────────────────────────────────────────────── */}
      {detailLeadId && (
        <LeadDetailModal
          leadId={detailLeadId}
          onClose={() => setDetailLeadId(null)}
          onRun={id => { runMutation.mutate(id); setDetailLeadId(null) }}
          onRerun={(id, from) => { rerunMutation.mutate({ leadId: id, from }); setDetailLeadId(null) }}
          onRunOnly={(id, agentType) => { runOnlyMutation.mutate({ leadId: id, agentType }); setDetailLeadId(null) }}
        />
      )}

    </div>
  )
}