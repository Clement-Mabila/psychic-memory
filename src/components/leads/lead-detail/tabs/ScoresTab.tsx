import { ScoreRow } from '../shared/ScoreRow'
import type { Draft } from '../types'

interface Props {
  lead: any
  editing: boolean
  draft: Draft | null
  setField: (k: keyof Draft) => (v: string) => void
}

export function ScoresTab({ lead, editing, draft, setField }: Props) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-4">Pipeline Scores</h3>

      <div className="border border-gray-100 dark:border-neutral-800 rounded-xl p-5 mb-4">
        <div className="flex flex-col gap-2.5">
          <ScoreRow label="Firmographic"   value={lead.firmographic_score}   />
          <ScoreRow label="Buying Signal"  value={lead.buying_signal_score}  />
          <ScoreRow label="Intent"         value={lead.intent_score}         />
          <ScoreRow label="Stakeholder"    value={lead.stakeholder_score}    />
          <ScoreRow label="Historical Win" value={lead.historical_win_score} />
        </div>
      </div>

      {(lead.qualification_summary || editing) && (
        <div className="border border-gray-100 dark:border-neutral-800 rounded-xl p-5">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">
            Qualification Summary
          </p>
          {editing && draft ? (
            <textarea
              value={draft.qualification_summary}
              onChange={e => setField('qualification_summary')(e.target.value)}
              rows={4}
              placeholder="Qualification summary…"
              className="w-full text-xs text-gray-700 dark:text-slate-300 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg px-2.5 py-2 resize-none outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 placeholder:text-gray-300 dark:placeholder:text-slate-600"
            />
          ) : (
            <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
              {lead.qualification_summary}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
