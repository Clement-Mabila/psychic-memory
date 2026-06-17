'use client'

import { useState } from 'react'
import {
  Boxes, CheckCircle2, XCircle, RefreshCw, Clock,
  ChevronUp, ChevronDown,
} from 'lucide-react'
import { cn, formatRelativeTime } from '@/lib/utils'

// ── Per-status icon + icon background ────────────────────────────────────────

const JOB_ICON_BG: Record<string, string> = {
  complete: 'bg-blue-100 text-blue-600 dark:text-blue-400',
  failed:   'bg-red-100 dark:bg-red-950/40 text-red-500 dark:text-red-400',
  running:  'bg-amber-100 dark:bg-amber-950/40 text-amber-500 dark:text-amber-400',
  pending:  'bg-pink-100 text-pink-500',
}

const JOB_ICON: Record<string, { icon: React.ElementType; spin?: boolean }> = {
  complete: { icon: CheckCircle2 },
  failed:   { icon: XCircle },
  running:  { icon: RefreshCw, spin: true },
  pending:  { icon: Clock },
}

const JOB_STATUS_BADGE: Record<string, string> = {
  complete: 'bg-emerald-600 text-white',
  failed:   'bg-red-50 dark:bg-red-950/400 text-white',
  running:  'bg-blue-50 dark:bg-blue-950/40 text-white',
  pending:  'bg-amber-50 dark:bg-amber-950/400 text-white',
}

const PAGE_SIZE = 6

interface Props {
  jobs: any[]
}

function OllamaIcon({ size = 19 }: { size?: number }) {
  return (
    <svg height={size} width={size} viewBox="0 0 75 74" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fillRule="evenodd" clipRule="evenodd" fill="currentColor" d="M24.7031 3.36019C25.3781 3.62227 25.9875 4.05394 26.5406 4.62436C27.4625 5.56786 28.2406 6.91836 28.8344 8.51861C29.4313 10.1281 29.8188 11.9103 29.9656 13.6986C31.9332 12.6003 34.1167 11.9316 36.3688 11.7376L36.5281 11.7253C39.2469 11.5094 41.9344 11.9935 44.2781 13.1868C44.5938 13.3502 44.9031 13.5259 45.2063 13.7109C45.3625 11.9565 45.7438 10.2144 46.3313 8.64194C46.925 7.03861 47.7031 5.69119 48.6219 4.74461C49.1353 4.19659 49.7634 3.76524 50.4625 3.48044C51.2656 3.17211 52.1188 3.11661 52.95 3.35094C54.2031 3.70244 55.2781 4.48561 56.125 5.62336C56.9 6.66244 57.4813 7.99444 57.8781 9.59161C58.5969 12.4714 58.7219 16.2609 58.2375 20.8304L58.4031 20.9537L58.4844 21.0123C60.85 22.7883 62.4969 25.3197 63.3688 28.2581C64.7281 32.843 64.0438 37.986 61.7 40.8628L61.6438 40.9275L61.65 40.9368C62.9531 43.2863 63.7438 45.7684 63.9125 48.3368L63.9188 48.4293C64.1188 51.713 63.2938 55.0184 61.375 58.2651L61.3531 58.2959L61.3844 58.3699C62.8594 61.9374 63.3219 65.5294 62.7531 69.1184L62.7344 69.2387C62.6463 69.7629 62.351 70.2313 61.9134 70.5411C61.4758 70.8509 60.9316 70.9769 60.4 70.8914C60.1368 70.8508 59.8843 70.7594 59.6569 70.6224C59.4296 70.4854 59.2318 70.3055 59.0751 70.093C58.9183 69.8804 58.8056 69.6395 58.7434 69.3839C58.6812 69.1283 58.6707 68.8631 58.7125 68.6035C59.2344 65.4184 58.7438 62.2241 57.2125 58.9743C57.0696 58.6724 57.0062 58.3398 57.028 58.0073C57.0499 57.6748 57.1563 57.353 57.3375 57.0719L57.35 57.0534C59.2375 54.2044 60.0188 51.4109 59.85 48.6667C59.7063 46.2648 58.8344 43.906 57.35 41.6583C57.0613 41.2213 56.9585 40.6898 57.0637 40.1786C57.169 39.6674 57.4739 39.2176 57.9125 38.9264L57.9406 38.9079C58.7 38.4177 59.4 37.1659 59.7531 35.4546C60.1428 33.4311 60.041 31.3453 59.4563 29.3681C58.8156 27.2098 57.6438 25.4091 56.0031 24.1789C54.1438 22.779 51.6813 22.1038 48.5656 22.298C48.1582 22.3242 47.7522 22.2291 47.4002 22.0252C47.0481 21.8213 46.7661 21.5178 46.5906 21.1541C45.6094 19.1037 44.1781 17.636 42.3938 16.7264C40.6806 15.8828 38.7627 15.5283 36.8563 15.7028C32.9656 16.008 29.5344 18.1725 28.5125 20.9013C28.3679 21.2853 28.1079 21.6166 27.7672 21.8508C27.4265 22.085 27.0215 22.2109 26.6063 22.2117C23.2719 22.2179 20.6906 22.9887 18.8031 24.3793C17.1719 25.5818 16.0594 27.2622 15.4719 29.2756C14.9402 31.1708 14.8675 33.1627 15.2594 35.0908C15.6094 36.8113 16.2938 38.2358 17.0781 39.0035L17.1031 39.0251C17.7656 39.6634 17.9063 40.6593 17.4438 41.4455C16.3188 43.3634 15.4781 46.2216 15.3406 48.9689C15.1844 52.1077 15.9219 54.8334 17.5875 56.7882L17.6375 56.8468C17.8889 57.1358 18.0505 57.4901 18.1032 57.8674C18.1558 58.2447 18.0972 58.629 17.9344 58.9743C16.1344 62.7853 15.5813 65.9179 16.1781 68.3846C16.2854 68.8975 16.1856 69.4315 15.8999 69.8729C15.6142 70.3143 15.1652 70.6283 14.6485 70.748C14.1317 70.8678 13.588 70.7838 13.1331 70.514C12.6781 70.2442 12.3478 69.8099 12.2125 69.3034C11.4531 66.1646 11.9688 62.5694 13.6906 58.5179L13.7344 58.41L13.7094 58.373C12.8631 57.1397 12.2315 55.7756 11.8406 54.3369L11.825 54.2784C11.3507 52.4835 11.164 50.6264 11.2719 48.7746C11.4094 45.9688 12.1406 43.0951 13.2156 40.7888L13.2531 40.7086L13.2469 40.7024C12.3312 39.4136 11.6531 37.764 11.2781 35.9387L11.2625 35.8647C10.7458 33.3186 10.8454 30.6882 11.5531 28.1872C12.3719 25.3659 13.9812 22.9424 16.3531 21.1911C16.5406 21.0524 16.7375 20.9136 16.9344 20.7841C16.4375 16.1807 16.5625 12.3666 17.2844 9.46827C17.6813 7.87111 18.2656 6.53911 19.0406 5.50002C19.8844 4.36536 20.9594 3.58219 22.2125 3.22761C23.0438 2.99327 23.9 3.04569 24.7031 3.35711V3.36019ZM37.5656 31.3877C40.4906 31.3877 43.1906 32.3528 45.2094 34.0239C47.1781 35.6489 48.35 37.8319 48.35 40.0056C48.35 42.7436 47.0813 44.8773 44.8094 46.2401C42.8719 47.3964 40.275 47.9575 37.3 47.9575C34.1469 47.9575 31.4531 47.1589 29.5094 45.6944C27.5813 44.2452 26.5 42.2102 26.5 40.0056C26.5 37.8257 27.7438 35.6365 29.8 34.0054C31.8875 32.3497 34.6438 31.3877 37.5656 31.3877ZM37.5656 34.1504C35.3976 34.1317 33.2871 34.8381 31.5781 36.1545C30.1375 37.2954 29.3219 38.7291 29.3219 40.0087C29.3219 41.3284 29.9781 42.5648 31.2281 43.5052C32.65 44.5751 34.7406 45.1949 37.3 45.1949C39.7969 45.1949 41.9031 44.7416 43.3375 43.8814C44.7844 43.018 45.525 41.7662 45.525 40.0056C45.525 38.7014 44.7563 37.2614 43.3906 36.1329C41.8781 34.8842 39.8281 34.1504 37.5656 34.1504ZM39.6344 37.8812L39.6469 37.8935C40.0219 38.3591 39.9438 39.0344 39.4719 39.4044L38.5594 40.1135V41.4887C38.5577 41.7948 38.4331 42.0878 38.2128 42.3034C37.9926 42.519 37.6946 42.6396 37.3844 42.6388C37.0741 42.6396 36.7762 42.519 36.5559 42.3034C36.3357 42.0878 36.211 41.7948 36.2094 41.4887V40.0704L35.3625 39.3982C35.2508 39.3099 35.1579 39.2006 35.0892 39.0767C35.0205 38.9527 34.9774 38.8166 34.9623 38.6762C34.9472 38.5357 34.9604 38.3937 35.0012 38.2583C35.042 38.1229 35.1096 37.9968 35.2 37.8874C35.3845 37.6658 35.6501 37.525 35.9391 37.4956C36.2282 37.4661 36.5173 37.5504 36.7438 37.7301L37.4156 38.2604L38.1031 37.7239C38.3288 37.548 38.6151 37.4661 38.9012 37.4954C39.1872 37.5248 39.4503 37.6632 39.6344 37.8812ZM23.8844 31.9643C25.3781 31.9643 26.5938 33.1668 26.5938 34.6499C26.5946 35.3608 26.3094 36.0429 25.8008 36.5465C25.2922 37.05 24.6018 37.3338 23.8813 37.3354C23.1618 37.333 22.4727 37.0493 21.9649 36.5465C21.457 36.0437 21.1719 35.3628 21.1719 34.6529C21.1702 33.942 21.4546 33.2595 21.9627 32.7554C22.4707 32.2513 23.1639 31.9667 23.8844 31.9643ZM51.0906 31.9643C52.5906 31.9643 53.8031 33.1668 53.8031 34.6499C53.804 35.3608 53.5187 36.0429 53.0101 36.5465C52.5015 37.05 51.8111 37.3338 51.0906 37.3354C50.3712 37.333 49.6821 37.0493 49.1742 36.5465C48.6664 36.0437 48.3812 35.3628 48.3813 34.6529C48.3796 33.942 48.664 33.2595 49.172 32.7554C49.68 32.2513 50.3701 31.9667 51.0906 31.9643ZM23.25 7.09102L23.2406 7.09719C22.8786 7.25252 22.5695 7.50724 22.35 7.83102L22.3344 7.84952C21.9031 8.43227 21.5281 9.28944 21.2469 10.4149C20.7156 12.5485 20.5719 15.4438 20.8594 18.9927C22.2031 18.598 23.6688 18.3514 25.2469 18.2619L25.2781 18.2589L25.3375 18.154C25.4813 17.9012 25.6344 17.6576 25.8 17.4171C26.1844 15.0399 25.8688 12.2001 25.0094 9.88144C24.5906 8.75911 24.0813 7.87727 23.5938 7.37469C23.4931 7.2702 23.381 7.17712 23.2594 7.09719L23.25 7.09102ZM51.9188 7.21436L51.9125 7.21744C51.7909 7.29737 51.6788 7.39045 51.5781 7.49494C51.0906 7.99752 50.5781 8.88244 50.1625 10.0048C49.2563 12.4529 48.9531 15.4808 49.4438 17.9351L49.625 18.2342L49.65 18.2774H49.7438C51.2947 18.2778 52.8375 18.4979 54.325 18.931C54.5938 15.4654 54.4438 12.6318 53.925 10.5382C53.6438 9.41277 53.2688 8.55561 52.8344 7.97286L52.8219 7.95436C52.6029 7.62943 52.2937 7.3736 51.9313 7.21744H51.9188V7.21436Z" />
    </svg>
  )
}

export function TrainingJobLog({ jobs }: Props) {
  const [offset, setOffset] = useState(0)

  const hasRunning  = jobs.some(j => j.status === 'running')
  const canScrollUp = offset > 0
  const canScrollDn = offset + PAGE_SIZE < jobs.length
  const visible     = jobs.slice(offset, offset + PAGE_SIZE)

  return (
    <div className="space-y-3">

      {/* ── Header card — matches TriggerPanel ── */}
      <div className="bg-stone-100 dark:bg-neutral-800 rounded-2xl border-none shadow-sm dark:shadow-none px-6 py-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
            <OllamaIcon size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100 leading-tight">
              Training Job Log
            </h2>
            <p className="text-xs text-gray-400 dark:text-slate-500 leading-tight mt-0.5">
              {hasRunning
                ? 'Job currently running…'
                : jobs.length === 0
                ? 'No training jobs yet'
                : `${jobs.length} job${jobs.length !== 1 ? 's' : ''} recorded`}
            </p>
          </div>
          {hasRunning && (
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse flex-shrink-0" />
          )}
        </div>

              {/* ── Job cards — 4 visible at a time ── */}
      {jobs.length > 0 && (
        <>
          <div className="flex flex-col gap-2">
            {visible.map((j: any) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>

          {/* Navigation arrows */}
          {jobs.length > PAGE_SIZE && (
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                onClick={() => setOffset(o => Math.max(0, o - 1))}
                disabled={!canScrollUp}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                  canScrollUp
                    ? 'bg-stone-200 dark:bg-neutral-800 text-stone-600 dark:text-slate-400 hover:bg-stone-300'
                    : 'bg-stone-100 dark:bg-neutral-800 text-stone-300 dark:text-slate-500 cursor-not-allowed',
                )}
              >
                <ChevronUp size={15} />
              </button>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {offset + 1}–{Math.min(offset + PAGE_SIZE, jobs.length)} of {jobs.length}
              </span>
              <button
                onClick={() => setOffset(o => Math.min(jobs.length - PAGE_SIZE, o + 1))}
                disabled={!canScrollDn}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                  canScrollDn
                    ? 'bg-stone-200 dark:bg-neutral-800 text-stone-600 dark:text-slate-400 hover:bg-stone-300'
                    : 'bg-stone-100 dark:bg-neutral-800 text-stone-300 dark:text-slate-500 cursor-not-allowed',
                )}
              >
                <ChevronDown size={15} />
              </button>
            </div>
          )}
        </>
      )}
      </div>


    </div>
  )
}

// ── Job card ─────────────────────────────────────────────────────────────────

function JobCard({ job }: { job: any }) {
  const iconCfg  = JOB_ICON[job.status]     ?? { icon: Clock }
  const iconBg   = JOB_ICON_BG[job.status]  ?? 'bg-slate-100 dark:bg-neutral-800 text-slate-400 dark:text-slate-500'
  const badgeCls = JOB_STATUS_BADGE[job.status] ?? 'bg-slate-200 text-slate-500 dark:text-slate-400'
  const Icon     = iconCfg.icon

  return (
    <div className="flex items-start gap-4 px-5 py-3 bg-neutral-200 dark:bg-neutral-800 rounded-2xl shadow-sm dark:shadow-none hover:shadow-md dark:hover:shadow-none transition-shadow">

      {/* Status icon */}
      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5', iconBg)}>
        <Icon size={18} strokeWidth={1.75} className={iconCfg.spin ? 'animate-spin' : undefined} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 capitalize">{job.job_type}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">{formatRelativeTime(job.created_at)}</span>
        </div>

        {job.model_version?.version_tag && (
          <p className="text-xs text-slate-600 dark:text-slate-400 ChevronsUp leading-snug">
            {job.model_version.version_tag}
            {job.dataset?.name && <span className="font-sans text-slate-400 dark:text-slate-500 ml-1">· {job.dataset.name}</span>}
          </p>
        )}
        {!job.model_version?.version_tag && job.dataset?.name && (
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug truncate">{job.dataset.name}</p>
        )}
        {job.error_msg && (
          <p className="text-xs text-red-500 dark:text-red-400 mt-0.5 truncate">{job.error_msg}</p>
        )}
      </div>

      {/* Status badge */}
      <span className={cn('text-[10px] font-semibold px-2 py-1 rounded-2xl flex-shrink-0 self-center', badgeCls)}>
        {job.status}
      </span>
    </div>
  )
}
