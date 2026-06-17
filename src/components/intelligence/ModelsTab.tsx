'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { List, Table2, PlusCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, formatRelativeTime } from '@/lib/utils'
import { ModelVersionCard } from './ModelVersionCard'
import { TrainingJobLog }   from './TrainingJobLog'
import { MV_STATUS_STYLE, CRITIC_NAMES } from './constants'
import api from '@/lib/api'

type ViewMode = 'list' | 'table' | 'log'

const VIEW_TABS: { id: ViewMode; label: string; Icon: any }[] = [
  { id: 'list',  label: 'List',         Icon: List       },
  { id: 'table', label: 'Table',        Icon: Table2     },
  { id: 'log',   label: 'Training Log', Icon: OllamaIcon },
]

const STATUS_FILTERS = ['all', 'promoted', 'trained', 'evaluating', 'retired']

const EMPTY_REG = {
  version_tag:     '',
  ollama_model_id: '',
  critic_id:       '',
  base_model:      'unsloth/Meta-Llama-3.1-8B-Instruct',
  notes:           '',
  eval_accuracy:   '',
  auto_promote:    false,
}

function OllamaIcon({ size = 19 }: { size?: number }) {
  return (
    <svg height={size} width={size} viewBox="0 0 75 74" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" fill="currentColor" d="M24.7031 3.36019C25.3781 3.62227 25.9875 4.05394 26.5406 4.62436C27.4625 5.56786 28.2406 6.91836 28.8344 8.51861C29.4313 10.1281 29.8188 11.9103 29.9656 13.6986C31.9332 12.6003 34.1167 11.9316 36.3688 11.7376L36.5281 11.7253C39.2469 11.5094 41.9344 11.9935 44.2781 13.1868C44.5938 13.3502 44.9031 13.5259 45.2063 13.7109C45.3625 11.9565 45.7438 10.2144 46.3313 8.64194C46.925 7.03861 47.7031 5.69119 48.6219 4.74461C49.1353 4.19659 49.7634 3.76524 50.4625 3.48044C51.2656 3.17211 52.1188 3.11661 52.95 3.35094C54.2031 3.70244 55.2781 4.48561 56.125 5.62336C56.9 6.66244 57.4813 7.99444 57.8781 9.59161C58.5969 12.4714 58.7219 16.2609 58.2375 20.8304L58.4031 20.9537L58.4844 21.0123C60.85 22.7883 62.4969 25.3197 63.3688 28.2581C64.7281 32.843 64.0438 37.986 61.7 40.8628L61.6438 40.9275L61.65 40.9368C62.9531 43.2863 63.7438 45.7684 63.9125 48.3368L63.9188 48.4293C64.1188 51.713 63.2938 55.0184 61.375 58.2651L61.3531 58.2959L61.3844 58.3699C62.8594 61.9374 63.3219 65.5294 62.7531 69.1184L62.7344 69.2387C62.6463 69.7629 62.351 70.2313 61.9134 70.5411C61.4758 70.8509 60.9316 70.9769 60.4 70.8914C60.1368 70.8508 59.8843 70.7594 59.6569 70.6224C59.4296 70.4854 59.2318 70.3055 59.0751 70.093C58.9183 69.8804 58.8056 69.6395 58.7434 69.3839C58.6812 69.1283 58.6707 68.8631 58.7125 68.6035C59.2344 65.4184 58.7438 62.2241 57.2125 58.9743C57.0696 58.6724 57.0062 58.3398 57.028 58.0073C57.0499 57.6748 57.1563 57.353 57.3375 57.0719L57.35 57.0534C59.2375 54.2044 60.0188 51.4109 59.85 48.6667C59.7063 46.2648 58.8344 43.906 57.35 41.6583C57.0613 41.2213 56.9585 40.6898 57.0637 40.1786C57.169 39.6674 57.4739 39.2176 57.9125 38.9264L57.9406 38.9079C58.7 38.4177 59.4 37.1659 59.7531 35.4546C60.1428 33.4311 60.041 31.3453 59.4563 29.3681C58.8156 27.2098 57.6438 25.4091 56.0031 24.1789C54.1438 22.779 51.6813 22.1038 48.5656 22.298C48.1582 22.3242 47.7522 22.2291 47.4002 22.0252C47.0481 21.8213 46.7661 21.5178 46.5906 21.1541C45.6094 19.1037 44.1781 17.636 42.3938 16.7264C40.6806 15.8828 38.7627 15.5283 36.8563 15.7028C32.9656 16.008 29.5344 18.1725 28.5125 20.9013C28.3679 21.2853 28.1079 21.6166 27.7672 21.8508C27.4265 22.085 27.0215 22.2109 26.6063 22.2117C23.2719 22.2179 20.6906 22.9887 18.8031 24.3793C17.1719 25.5818 16.0594 27.2622 15.4719 29.2756C14.9402 31.1708 14.8675 33.1627 15.2594 35.0908C15.6094 36.8113 16.2938 38.2358 17.0781 39.0035L17.1031 39.0251C17.7656 39.6634 17.9063 40.6593 17.4438 41.4455C16.3188 43.3634 15.4781 46.2216 15.3406 48.9689C15.1844 52.1077 15.9219 54.8334 17.5875 56.7882L17.6375 56.8468C17.8889 57.1358 18.0505 57.4901 18.1032 57.8674C18.1558 58.2447 18.0972 58.629 17.9344 58.9743C16.1344 62.7853 15.5813 65.9179 16.1781 68.3846C16.2854 68.8975 16.1856 69.4315 15.8999 69.8729C15.6142 70.3143 15.1652 70.6283 14.6485 70.748C14.1317 70.8678 13.588 70.7838 13.1331 70.514C12.6781 70.2442 12.3478 69.8099 12.2125 69.3034C11.4531 66.1646 11.9688 62.5694 13.6906 58.5179L13.7344 58.41L13.7094 58.373C12.8631 57.1397 12.2315 55.7756 11.8406 54.3369L11.825 54.2784C11.3507 52.4835 11.164 50.6264 11.2719 48.7746C11.4094 45.9688 12.1406 43.0951 13.2156 40.7888L13.2531 40.7086L13.2469 40.7024C12.3312 39.4136 11.6531 37.764 11.2781 35.9387L11.2625 35.8647C10.7458 33.3186 10.8454 30.6882 11.5531 28.1872C12.3719 25.3659 13.9812 22.9424 16.3531 21.1911C16.5406 21.0524 16.7375 20.9136 16.9344 20.7841C16.4375 16.1807 16.5625 12.3666 17.2844 9.46827C17.6813 7.87111 18.2656 6.53911 19.0406 5.50002C19.8844 4.36536 20.9594 3.58219 22.2125 3.22761C23.0438 2.99327 23.9 3.04569 24.7031 3.35711V3.36019ZM37.5656 31.3877C40.4906 31.3877 43.1906 32.3528 45.2094 34.0239C47.1781 35.6489 48.35 37.8319 48.35 40.0056C48.35 42.7436 47.0813 44.8773 44.8094 46.2401C42.8719 47.3964 40.275 47.9575 37.3 47.9575C34.1469 47.9575 31.4531 47.1589 29.5094 45.6944C27.5813 44.2452 26.5 42.2102 26.5 40.0056C26.5 37.8257 27.7438 35.6365 29.8 34.0054C31.8875 32.3497 34.6438 31.3877 37.5656 31.3877ZM37.5656 34.1504C35.3976 34.1317 33.2871 34.8381 31.5781 36.1545C30.1375 37.2954 29.3219 38.7291 29.3219 40.0087C29.3219 41.3284 29.9781 42.5648 31.2281 43.5052C32.65 44.5751 34.7406 45.1949 37.3 45.1949C39.7969 45.1949 41.9031 44.7416 43.3375 43.8814C44.7844 43.018 45.525 41.7662 45.525 40.0056C45.525 38.7014 44.7563 37.2614 43.3906 36.1329C41.8781 34.8842 39.8281 34.1504 37.5656 34.1504ZM39.6344 37.8812L39.6469 37.8935C40.0219 38.3591 39.9438 39.0344 39.4719 39.4044L38.5594 40.1135V41.4887C38.5577 41.7948 38.4331 42.0878 38.2128 42.3034C37.9926 42.519 37.6946 42.6396 37.3844 42.6388C37.0741 42.6396 36.7762 42.519 36.5559 42.3034C36.3357 42.0878 36.211 41.7948 36.2094 41.4887V40.0704L35.3625 39.3982C35.2508 39.3099 35.1579 39.2006 35.0892 39.0767C35.0205 38.9527 34.9774 38.8166 34.9623 38.6762C34.9472 38.5357 34.9604 38.3937 35.0012 38.2583C35.042 38.1229 35.1096 37.9968 35.2 37.8874C35.3845 37.6658 35.6501 37.525 35.9391 37.4956C36.2282 37.4661 36.5173 37.5504 36.7438 37.7301L37.4156 38.2604L38.1031 37.7239C38.3288 37.548 38.6151 37.4661 38.9012 37.4954C39.1872 37.5248 39.4503 37.6632 39.6344 37.8812ZM23.8844 31.9643C25.3781 31.9643 26.5938 33.1668 26.5938 34.6499C26.5946 35.3608 26.3094 36.0429 25.8008 36.5465C25.2922 37.05 24.6018 37.3338 23.8813 37.3354C23.1618 37.333 22.4727 37.0493 21.9649 36.5465C21.457 36.0437 21.1719 35.3628 21.1719 34.6529C21.1702 33.942 21.4546 33.2595 21.9627 32.7554C22.4707 32.2513 23.1639 31.9667 23.8844 31.9643ZM51.0906 31.9643C52.5906 31.9643 53.8031 33.1668 53.8031 34.6499C53.804 35.3608 53.5187 36.0429 53.0101 36.5465C52.5015 37.05 51.8111 37.3338 51.0906 37.3354C50.3712 37.333 49.6821 37.0493 49.1742 36.5465C48.6664 36.0437 48.3812 35.3628 48.3813 34.6529C48.3796 33.942 48.664 33.2595 49.172 32.7554C49.68 32.2513 50.3701 31.9667 51.0906 31.9643ZM23.25 7.09102L23.2406 7.09719C22.8786 7.25252 22.5695 7.50724 22.35 7.83102L22.3344 7.84952C21.9031 8.43227 21.5281 9.28944 21.2469 10.4149C20.7156 12.5485 20.5719 15.4438 20.8594 18.9927C22.2031 18.598 23.6688 18.3514 25.2469 18.2619L25.2781 18.2589L25.3375 18.154C25.4813 17.9012 25.6344 17.6576 25.8 17.4171C26.1844 15.0399 25.8688 12.2001 25.0094 9.88144C24.5906 8.75911 24.0813 7.87727 23.5938 7.37469C23.4931 7.2702 23.381 7.17712 23.2594 7.09719L23.25 7.09102ZM51.9188 7.21436L51.9125 7.21744C51.7909 7.29737 51.6788 7.39045 51.5781 7.49494C51.0906 7.99752 50.5781 8.88244 50.1625 10.0048C49.2563 12.4529 48.9531 15.4808 49.4438 17.9351L49.625 18.2342L49.65 18.2774H49.7438C51.2947 18.2778 52.8375 18.4979 54.325 18.931C54.5938 15.4654 54.4438 12.6318 53.925 10.5382C53.6438 9.41277 53.2688 8.55561 52.8344 7.97286L52.8219 7.95436C52.6029 7.62943 52.2937 7.3736 51.9313 7.21744H51.9188V7.21436Z" />
    </svg>
  )
}

export function ModelsTab() {
  const qc = useQueryClient()
  const [view,           setView]         = useState<ViewMode>('list')
  const [statusFilter,   setStatusFilter] = useState('all')
  const [showRegister,   setShowRegister] = useState(false)
  const [regForm,        setRegForm]      = useState({ ...EMPTY_REG })
  const [regMsg,         setRegMsg]       = useState<{ ok: boolean; text: string } | null>(null)

  const { data: jobsData } = useQuery({
    queryKey:        ['training-jobs'],
    queryFn:         () => api.get('/training/jobs').then(r => r.data),
    refetchInterval: 5_000,
  })

  const jobs: any[] = jobsData?.jobs ?? []
  const runningEvalIds = new Set<number>(
    jobs
      .filter((j: any) => j.job_type === 'evaluate' && j.status === 'running' && j.model_version?.id)
      .map((j: any) => j.model_version.id as number)
  )

  const { data, isLoading } = useQuery({
    queryKey:        ['training-models'],
    queryFn:         () => api.get('/training/models').then(r => r.data),
    staleTime:       10_000,
    refetchInterval: runningEvalIds.size > 0 ? 5_000 : false,
  })

  const promoteMutation = useMutation({
    mutationFn: (id: number) => api.post(`/training/models/${id}/promote`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['training-models'] }),
  })

  const retireMutation = useMutation({
    mutationFn: (id: number) => api.post(`/training/models/${id}/retire`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['training-models'] }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: number; patch: { base_model: string } }) =>
      api.patch(`/training/models/${id}`, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training-models'] }),
  })

  const [evalMsg, setEvalMsg] = useState<string | null>(null)
  const evaluateMutation = useMutation({
    mutationFn: (id: number) => api.post(`/training/models/${id}/evaluate`),
    onSuccess: (res) => {
      setEvalMsg(`Evaluation queued · task ${res.data.task_id?.slice(0, 8)}… · auto-promotes at ≥80% accuracy`)
      qc.invalidateQueries({ queryKey: ['training-jobs'] })
    },
    onError: (err: any) => {
      setEvalMsg(`Error: ${err.response?.data?.error ?? err.message}`)
    },
  })

  const registerMutation = useMutation({
    mutationFn: (body: typeof EMPTY_REG) => api.post('/training/models/register', {
      ...body,
      eval_accuracy: body.eval_accuracy ? parseFloat(body.eval_accuracy) : undefined,
    }),
    onSuccess: (res) => {
      const d = res.data
      setRegMsg({ ok: true, text: `Registered ${d.version_tag}${d.is_active ? ' · promoted to active' : ''}` })
      setRegForm({ ...EMPTY_REG })
      qc.invalidateQueries({ queryKey: ['training-models'] })
    },
    onError: (err: any) => {
      setRegMsg({ ok: false, text: err.response?.data?.error ?? err.message })
    },
  })

  const allModels: any[] = data?.models ?? []
  const models = statusFilter === 'all'
    ? allModels
    : allModels.filter(m => m.status === statusFilter)

  const activeCount = allModels.filter(m => m.is_active).length

  return (
    <div className="space-y-4">

      {/* Controls row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">

        {/* View tabs */}
        <div className="flex items-center gap-0.5">
          {VIEW_TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors font-normal',
                view === id
                  ? 'bg-gray-100 dark:bg-neutral-800 text-gray-900 dark:text-slate-100'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800',
              )}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter pills — hidden on log view */}
          <div className={cn('flex items-center gap-1.5 flex-wrap', view === 'log' && 'invisible')}>
            {STATUS_FILTERS.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-2.5 rounded-2xl text-xs font-medium border transition-all capitalize',
                  statusFilter === s
                    ? 'bg-cyan-500 text-white border-cyan-500'
                    : 'bg-white dark:bg-neutral-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-neutral-700 hover:border-slate-300 dark:hover:border-slate-600',
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Register button */}
          <button
            onClick={() => { setShowRegister(v => !v); setRegMsg(null) }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-medium border transition-all',
              showRegister
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white dark:bg-neutral-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-neutral-700 hover:border-slate-300 dark:hover:border-slate-600',
            )}
          >
            {showRegister ? <X size={12} /> : <PlusCircle size={12} />}
            Register Model
          </button>
        </div>
      </div>

      {/* ── REGISTER PANEL ── */}
      {showRegister && (
        <div className="bg-stone-50 dark:bg-neutral-800 border border-stone-200 dark:border-neutral-700 rounded-2xl p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">Register locally-trained model</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
              Run <code className="bg-stone-200 dark:bg-neutral-800 px-1 rounded text-[11px]">ollama create mbody-critic:v2 -f Modelfile</code> first, then fill in the Ollama tag below.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">Version tag *</label>
              <input
                placeholder="mbody-critic-v2"
                value={regForm.version_tag}
                onChange={e => setRegForm(f => ({ ...f, version_tag: e.target.value }))}
                className="h-9 border border-gray-200 dark:border-neutral-700 rounded-xl text-xs px-3 outline-none focus:border-gray-400 dark:focus:border-slate-500 bg-white dark:bg-neutral-900"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">Ollama model tag *</label>
              <input
                placeholder="mbody-critic:v2"
                value={regForm.ollama_model_id}
                onChange={e => setRegForm(f => ({ ...f, ollama_model_id: e.target.value }))}
                className="h-9 border border-gray-200 dark:border-neutral-700 rounded-xl text-xs px-3 outline-none focus:border-gray-400 dark:focus:border-slate-500 bg-white dark:bg-neutral-900"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">Scope</label>
              <select
                value={regForm.critic_id}
                onChange={e => setRegForm(f => ({ ...f, critic_id: e.target.value }))}
                className="h-9 border border-gray-200 dark:border-neutral-700 rounded-xl text-xs px-3 outline-none focus:border-gray-400 dark:focus:border-slate-500 bg-white dark:bg-neutral-900 text-gray-700 dark:text-slate-300"
              >
                <option value="">Shared (all critics)</option>
                {Object.entries(CRITIC_NAMES).map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">Eval accuracy (0–1)</label>
              <input
                placeholder="0.87"
                value={regForm.eval_accuracy}
                onChange={e => setRegForm(f => ({ ...f, eval_accuracy: e.target.value }))}
                className="h-9 border border-gray-200 dark:border-neutral-700 rounded-xl text-xs px-3 outline-none focus:border-gray-400 dark:focus:border-slate-500 bg-white dark:bg-neutral-900"
              />
            </div>
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-[11px] text-gray-500 dark:text-slate-400 font-medium">Notes</label>
              <input
                placeholder="Trained on 2026-06-06 export · v2 GGUF Q4_K_M"
                value={regForm.notes}
                onChange={e => setRegForm(f => ({ ...f, notes: e.target.value }))}
                className="h-9 border border-gray-200 dark:border-neutral-700 rounded-xl text-xs px-3 outline-none focus:border-gray-400 dark:focus:border-slate-500 bg-white dark:bg-neutral-900"
              />
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-3">
            <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={regForm.auto_promote}
                onChange={e => setRegForm(f => ({ ...f, auto_promote: e.target.checked }))}
                className="cursor-pointer"
              />
              Promote to active immediately
            </label>

            <div className="flex items-center gap-3">
              {regMsg && (
                <span className={cn(
                  'text-xs px-3 py-1.5 rounded-full',
                  regMsg.ok ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400',
                )}>
                  {regMsg.text}
                </span>
              )}
              <Button
                variant="primary" size="sm"
                loading={registerMutation.isPending}
                disabled={!regForm.version_tag || !regForm.ollama_model_id}
                onClick={() => { setRegMsg(null); registerMutation.mutate(regForm) }}
              >
                Register
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Evaluate feedback banner */}
      {evalMsg && (
        <div className={cn(
          'text-xs px-4 py-2.5 rounded-xl',
          evalMsg.startsWith('Error') ? 'bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400' : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400',
        )}>
          {evalMsg}
        </div>
      )}

      {/* Summary — hidden on log view */}
      {view !== 'log' && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          {allModels.length} version{allModels.length !== 1 ? 's' : ''} · {activeCount} active
          {statusFilter !== 'all' && ` · showing ${models.length} ${statusFilter}`}
        </p>
      )}

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <div className="flex flex-col gap-2">
          {isLoading && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-neutral-200 dark:bg-neutral-800 rounded-2xl animate-pulse" />
          ))}
          {!isLoading && models.length === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-12">
              No model versions match the current filter
            </p>
          )}
          {models.map((mv: any) => (
            <ModelVersionCard
              key={mv.id}
              mv={mv}
              onPromote={id => promoteMutation.mutate(id)}
              onRetire={id => retireMutation.mutate(id)}
              onEvaluate={id => { setEvalMsg(null); evaluateMutation.mutate(id) }}
              onUpdate={(id, patch) => updateMutation.mutate({ id, patch })}
              promoting={promoteMutation.isPending}
              retiring={retireMutation.isPending}
              evaluating={evaluateMutation.isPending}
              isRunningEval={runningEvalIds.has(mv.id)}
            />
          ))}
        </div>
      )}

      {/* ── TABLE VIEW ── */}
      {view === 'table' && (
        <div className="rounded-2xl border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800">
                {['Version', 'Scope', 'Status', 'Accuracy', 'Examples', 'Base model', 'Promoted', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-[10px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-400 dark:text-slate-500">Loading…</td></tr>
              )}
              {!isLoading && models.length === 0 && (
                <tr><td colSpan={8} className="px-5 py-10 text-center text-sm text-slate-400 dark:text-slate-500">No versions match the current filter</td></tr>
              )}
              {models.map((mv: any) => (
                <tr key={mv.id} className="border-b border-slate-50 dark:border-neutral-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {mv.is_active && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />}
                      <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{mv.version_tag}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{mv.critic_id || 'shared'}</td>
                  <td className="px-5 py-3.5">
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium', MV_STATUS_STYLE[mv.status] ?? 'bg-slate-100 dark:bg-neutral-800 text-slate-500 dark:text-slate-400')}>
                      {mv.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-200">
                    {mv.eval_accuracy != null ? `${(mv.eval_accuracy * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{mv.dataset?.example_count ?? '—'}</td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">{mv.base_model}</td>
                  <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">
                    {mv.promoted_at ? formatRelativeTime(mv.promoted_at) : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-1.5">
                      {mv.status === 'trained' && (
                        <Button size="sm" variant="secondary" loading={evaluateMutation.isPending} onClick={() => { setEvalMsg(null); evaluateMutation.mutate(mv.id) }}>Evaluate</Button>
                      )}
                      {mv.status !== 'promoted' && mv.status !== 'base' && (
                        <Button size="sm" variant="secondary" loading={promoteMutation.isPending} onClick={() => promoteMutation.mutate(mv.id)}>Promote</Button>
                      )}
                      {mv.is_active && (
                        <Button size="sm" variant="ghost" loading={retireMutation.isPending} onClick={() => retireMutation.mutate(mv.id)}>Retire</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── TRAINING LOG VIEW ── */}
      {view === 'log' && <TrainingJobLog jobs={jobs} />}
    </div>
  )
}
