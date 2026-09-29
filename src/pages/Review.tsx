import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { QuizRunner } from '../components/QuizRunner'
import { Segmented } from '../components/Segmented'
import { Tabs } from '../components/Tabs'
import { BigButton, Field, OptionCards } from '../components/common'
import { UNITS } from '../data'
import { cardById, unitCards, type Direction, type Kind, type StudyCard } from '../lib/cards'
import { db } from '../lib/db'
import { useCourseState } from '../lib/progress'
import { navigate } from '../lib/router'
import type { SessionConfig } from '../lib/session'
import { usePersistentState } from '../lib/storage'

const TABS = [
  { id: 'due', label: '오늘의 복습' },
  { id: 'practice', label: '자유 연습' },
]

/** 한 번에 복습할 최대 개수 */
const BATCH = 30

function formatWhen(ms: number): string {
  const diff = ms - Date.now()
  const min = Math.round(diff / 60000)
  if (min < 60) return `${Math.max(1, min)}분 후`
  const hour = Math.round(min / 60)
  if (hour < 24) return `${hour}시간 후`
  return `${Math.round(hour / 24)}일 후`
}

export function Review({ tab = 'due' }: { tab?: string }) {
  const [config, setConfig] = useState<SessionConfig | null>(null)
  if (config) return <QuizRunner config={config} onExit={() => setConfig(null)} />
  return (
    <div>
      <h1 className="mb-3 text-2xl font-bold">복습·연습</h1>
      <Tabs base="review" current={tab} tabs={TABS} />
      <div className="pt-4">
        {tab === 'due' && <Due onStart={setConfig} />}
        {tab === 'practice' && <Practice onStart={setConfig} />}
      </div>
    </div>
  )
}

const KIND_LABEL: Record<Kind, string> = { char: '한자', word: '단어', sent: '문장', tone: '발음' }

function Due({ onStart }: { onStart: (c: SessionConfig) => void }) {
  const data = useLiveQuery(async () => {
    const now = Date.now()
    const due = await db.stats.where('due').belowOrEqual(now).sortBy('due')
    const next = await db.stats.where('due').above(now).first()
    const total = await db.stats.where('due').above(0).count()
    return { due, nextDue: next?.due, total }
  }, [])
  if (!data) return null

  const cards = data.due.map((s) => cardById(s.id)).filter((c): c is StudyCard => !!c)
  const counts = (Object.keys(KIND_LABEL) as Kind[])
    .map((k) => [k, cards.filter((c) => c.kind === k).length] as const)
    .filter(([, n]) => n > 0)

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <div className="text-sm text-slate-500">지금 복습할 항목</div>
        <div className="mt-1 text-6xl font-bold tabular-nums text-red-600">{cards.length}</div>
        {cards.length > 0 && <div className="mt-2 text-sm text-slate-500">{counts.map(([k, n]) => `${KIND_LABEL[k]} ${n}개`).join(' · ')}</div>}
      </div>

      {cards.length > 0 ? (
        <BigButton onClick={() => onStart({ cards: cards.slice(0, BATCH), mode: { type: 'review' }, directions: { word: ['fb', 'bf', 'lb', 'tn'], tone: ['tn', 'ls'] } })}>
          복습 시작 {cards.length > BATCH && `(${BATCH}개씩)`}
        </BigButton>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-sm text-emerald-800">
          {data.total === 0 ? (
            <>
              아직 복습할 기록이 없어요. 단원에서 퀴즈를 풀면 복습 일정이 자동으로 만들어져요.
              <button type="button" onClick={() => navigate('course')} className="mt-3 block w-full rounded-xl bg-white py-2.5 font-semibold text-red-600">
                학습하러 가기
              </button>
            </>
          ) : (
            <>🎉 지금은 복습할 게 없어요!{data.nextDue && <> 다음 복습은 {formatWhen(data.nextDue)}예요.</>}</>
          )}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-600">
        <h2 className="mb-2 font-semibold text-slate-800">🔁 간격 반복이란?</h2>
        <p>
          잊어버릴 때쯤 다시 보면 기억이 훨씬 오래가요. 맞힌 항목은 복습 간격이 점점 길어지고(1일 → 3일 → 1주 → …), 틀린 항목은 곧바로 다시 나와요. 단원 퀴즈와 복습에서 푼
          모든 문제가 자동으로 일정에 반영돼요. (FSRS 알고리즘)
        </p>
      </section>
    </div>
  )
}

type PracticeType = 'charRead' | 'charListen' | 'word' | 'tone' | 'typing' | 'arrange'
const PRACTICE_LABEL: Record<PracticeType, string> = {
  charRead: '字 한자 보고 발음·뜻 고르기',
  charListen: '🔊 듣고 한자 고르기',
  word: '📖 단어 뜻 (보기·듣기 섞어서)',
  tone: '🎵 듣고 성조 고르기',
  typing: '⌨️ 병음 입력하기',
  arrange: '🧩 문장 어순 배열',
}
const PRACTICE_SETUP: Record<PracticeType, { kind: 'chars' | 'words' | 'sentences'; directions: Partial<Record<Kind, Direction[]>> }> = {
  charRead: { kind: 'chars', directions: { char: ['fb'] } },
  charListen: { kind: 'chars', directions: { char: ['lf'] } },
  word: { kind: 'words', directions: { word: ['fb', 'bf', 'lb'] } },
  tone: { kind: 'words', directions: { word: ['tn'] } },
  typing: { kind: 'words', directions: { word: ['ty'] } },
  arrange: { kind: 'sentences', directions: { sent: ['ar'] } },
}

function Practice({ onStart }: { onStart: (c: SessionConfig) => void }) {
  const state = useCourseState()
  const lastUnit = UNITS[UNITS.length - 1]?.id ?? 1
  const currentUnit = state.current.kind === 'unit' ? state.current.unit.id : 1
  const [s, setS] = usePersistentState('practice', { type: 'word' as PracticeType, count: 20, from: 1, to: 0 })
  const to = Math.min(lastUnit, s.to || currentUnit)
  const from = Math.min(s.from, to)
  const setup = PRACTICE_SETUP[s.type]
  const cards = UNITS.filter((u) => u.id >= from && u.id <= to).flatMap((u) => unitCards(u.id)[setup.kind])

  const unitSelect = (value: number, onChange: (n: number) => void) => (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
      {UNITS.map((u) => (
        <option key={u.id} value={u.id}>
          {u.id}과 {u.title}
        </option>
      ))}
    </select>
  )

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-500">원하는 단원 범위와 문제 유형을 골라 자유롭게 연습해요. 푼 결과는 복습 일정에도 반영돼요.</p>
      <Field label="방식">
        <OptionCards value={s.type} options={PRACTICE_LABEL} onChange={(v) => setS({ ...s, type: v })} />
      </Field>
      <Field label={`범위 (${cards.length}개)`}>
        <div className="flex items-center gap-2">
          {unitSelect(from, (n) => setS({ ...s, from: n, to: Math.max(n, to) }))}
          <span className="text-slate-400">~</span>
          {unitSelect(to, (n) => setS({ ...s, to: n, from: Math.min(from, n) }))}
        </div>
        <button type="button" onClick={() => setS({ ...s, from: 1, to: currentUnit })} className="text-xs text-red-600">
          처음부터 지금 배우는 단원까지
        </button>
      </Field>
      <Field label="문제 수">
        <Segmented value={String(s.count)} onChange={(v) => setS({ ...s, count: Number(v) })} options={[10, 20, 30].map((n) => ({ value: String(n), label: `${n}문제` }))} />
      </Field>
      <BigButton disabled={cards.length === 0} onClick={() => onStart({ cards, directions: setup.directions, mode: { type: 'practice', count: s.count } })}>
        시작하기
      </BigButton>
    </div>
  )
}
