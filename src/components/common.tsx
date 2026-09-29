import type { ReactNode } from 'react'
import type { Sentence, Word } from '../data'
import { sentenceText } from '../data'
import type { Mastery } from '../lib/db'
import { speak } from '../lib/speech'
import { useShowPinyin } from '../lib/storage'
import { Pinyin } from './Pinyin'
import { Zh } from './Zh'

export const MASTERY_STYLE: Record<Mastery, string> = {
  new: 'bg-white border-slate-200',
  weak: 'bg-red-50 border-red-200',
  learning: 'bg-amber-50 border-amber-200',
  mastered: 'bg-emerald-50 border-emerald-200',
}

export function MasteryLegend() {
  const items: [Mastery, string][] = [
    ['new', '아직 안 풀어봄'],
    ['weak', '최근에 틀림'],
    ['learning', '학습 중'],
    ['mastered', '익힘 (연속 3회 정답)'],
  ]
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
      {items.map(([m, label]) => (
        <span key={m} className="flex items-center gap-1">
          <span className={`inline-block size-3 rounded border ${MASTERY_STYLE[m]}`} />
          {label}
        </span>
      ))}
    </div>
  )
}

/** 단어 한 줄: 누르면 발음 */
export function WordRow({ w, mastery = 'new', right }: { w: Word; mastery?: Mastery; right?: ReactNode }) {
  const [showPinyin] = useShowPinyin()
  return (
    <li>
      <button type="button" onClick={() => speak(w.h)} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left ${MASTERY_STYLE[mastery]}`}>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <Zh className="text-xl">{w.h}</Zh>
            {showPinyin && <Pinyin text={w.p} className="text-sm" />}
          </span>
          <span className="block text-sm text-slate-600">{w.m}</span>
          {w.note && <span className="block text-xs text-slate-400">{w.note}</span>}
        </span>
        {right}
        <span className="shrink-0 text-slate-300">🔊</span>
      </button>
    </li>
  )
}

/** 예문 한 줄: 누르면 발음 */
export function SentenceRow({ s }: { s: Sentence }) {
  const [showPinyin] = useShowPinyin()
  return (
    <button type="button" onClick={() => speak(sentenceText(s))} className="flex w-full items-start gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-left hover:bg-red-50">
      <span className="mt-1 text-slate-400">🔊</span>
      <span className="min-w-0">
        {showPinyin && <Pinyin text={s.p} className="block text-sm" />}
        <Zh className="block text-lg leading-snug">{sentenceText(s)}</Zh>
        <span className="block text-sm text-slate-500">{s.m}</span>
      </span>
    </button>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      {children}
    </div>
  )
}

export function OptionCards<T extends string>({ value, options, onChange }: { value: T; options: Record<T, string>; onChange: (v: T) => void }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {(Object.keys(options) as T[]).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={`rounded-xl border px-4 py-3 text-left text-sm font-medium ${value === m ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-600'}`}
        >
          {options[m]}
        </button>
      ))}
    </div>
  )
}

export function BigButton({ onClick, disabled, children, tone = 'primary' }: { onClick: () => void; disabled?: boolean; children: ReactNode; tone?: 'primary' | 'soft' }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`w-full rounded-2xl py-3.5 font-bold shadow-sm transition active:scale-[0.98] disabled:bg-slate-200 disabled:text-slate-400 ${
        tone === 'primary' ? 'bg-red-600 text-white' : 'border border-red-200 bg-red-50 text-red-700'
      }`}
    >
      {children}
    </button>
  )
}

export function BackLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-sm text-slate-500 hover:text-slate-700">
      ← {label}
    </button>
  )
}
