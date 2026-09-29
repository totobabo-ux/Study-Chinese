import { useMemo, useState } from 'react'
import { Pinyin } from '../components/Pinyin'
import { Tabs } from '../components/Tabs'
import { Zh } from '../components/Zh'
import { MASTERY_STYLE, MasteryLegend, WordRow } from '../components/common'
import { ALL_WORDS, CHARS_IN_ORDER, UNITS, UNIT_OF_CHAR, wordId } from '../data'
import { mastery } from '../lib/db'
import { parseSyllable } from '../lib/pinyin'
import { useStatMap } from '../lib/progress'
import { navigate } from '../lib/router'
import { usePersistentState, useShowPinyin } from '../lib/storage'

const TABS = [
  { id: 'words', label: '단어' },
  { id: 'chars', label: '한자' },
]

const STAGE_OF_UNIT = new Map(UNITS.map((u) => [u.id, u.stage]))
const STAGE_FILTERS = [
  { value: 0, label: '전체' },
  { value: 1, label: '1단계' },
  { value: 2, label: '2단계' },
  { value: 3, label: '3단계' },
]

/** 검색어 비교용: 병음은 성조 기호·공백·' 를 떼고 비교 (ü는 v로도 찾을 수 있게) */
function plain(s: string): string {
  return parseSyllable(s).base.replace(/['\s]/g, '').replace(/ü/g, 'v')
}

export function Dictionary({ tab = 'words' }: { tab?: string }) {
  return (
    <div>
      <h1 className="mb-3 text-2xl font-bold">사전</h1>
      <Tabs base="dict" current={tab} tabs={TABS} />
      {tab === 'words' && <WordList />}
      {tab === 'chars' && <CharGrid />}
    </div>
  )
}

function StageFilter({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1.5">
      {STAGE_FILTERS.map((f) => (
        <button
          key={f.value}
          type="button"
          onClick={() => onChange(f.value)}
          className={`rounded-full border px-3 py-1.5 text-sm ${value === f.value ? 'border-red-500 bg-red-500 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}

const PAGE = 100

function WordList() {
  const statMap = useStatMap()
  const [showPinyin, setShowPinyin] = useShowPinyin()
  const [stage, setStage] = usePersistentState('dict.stage', 0)
  const [query, setQuery] = useState('')
  const [limit, setLimit] = useState(PAGE)

  const index = useMemo(() => ALL_WORDS.map((x) => ({ ...x, key: plain(x.word.p) })), [])
  const q = query.trim()
  const qPlain = /^[a-zA-Züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ\s']+$/.test(q) ? plain(q) : ''
  const list = index.filter(
    (x) =>
      (stage === 0 || STAGE_OF_UNIT.get(x.unit) === stage) &&
      (!q || x.word.h.includes(q) || x.word.m.includes(q) || (qPlain !== '' && x.key.startsWith(qPlain))),
  )

  return (
    <div className="space-y-3 pt-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setLimit(PAGE)
          }}
          placeholder="검색 (한자, 병음, 뜻)"
          className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400"
        />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={showPinyin} onChange={(e) => setShowPinyin(e.target.checked)} className="size-4 accent-red-600" />
          병음
        </label>
      </div>
      <StageFilter
        value={stage}
        onChange={(v) => {
          setStage(v)
          setLimit(PAGE)
        }}
      />
      <div className="text-sm text-slate-500">{list.length}개</div>
      <ul className="space-y-1.5">
        {list.slice(0, limit).map(({ word, unit }) => (
          <WordRow
            key={wordId(word)}
            w={word}
            mastery={mastery(statMap?.get(wordId(word)))}
            right={
              <span
                role="link"
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`unit/${unit}/words`)
                }}
                className="shrink-0 rounded-md px-1 text-xs text-slate-400 underline-offset-2 hover:underline"
              >
                {unit}과
              </span>
            }
          />
        ))}
      </ul>
      {list.length > limit && (
        <button type="button" onClick={() => setLimit(limit + PAGE)} className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium">
          더 보기 ({list.length - limit}개 남음)
        </button>
      )}
    </div>
  )
}

function CharGrid() {
  const statMap = useStatMap()
  const [stage, setStage] = usePersistentState('dict.charStage', 0)
  const [query, setQuery] = useState('')
  const q = query.trim()
  const qPlain = /^[a-zA-Züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]+$/.test(q) ? plain(q) : ''
  const list = CHARS_IN_ORDER.filter(
    (c) =>
      (stage === 0 || STAGE_OF_UNIT.get(UNIT_OF_CHAR.get(c.c) ?? 0) === stage) &&
      (!q || c.c === q || c.t === q || c.m.includes(q) || c.hun.includes(q) || (qPlain !== '' && plain(c.p) === qPlain)),
  )
  const masteredCount = CHARS_IN_ORDER.filter((c) => mastery(statMap?.get(`char:${c.c}`)) === 'mastered').length

  return (
    <div className="space-y-3 pt-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm">
        <div className="flex items-baseline justify-between">
          <span className="font-semibold">익힌 한자</span>
          <span className="tabular-nums text-slate-500">
            {masteredCount} / {CHARS_IN_ORDER.length}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(masteredCount / CHARS_IN_ORDER.length) * 100}%` }} />
        </div>
      </div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="검색 (한자, 병음, 뜻, 한국 한자음)"
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-red-400"
      />
      <StageFilter value={stage} onChange={setStage} />
      <MasteryLegend />
      <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-8">
        {list.map((c) => (
          <button
            key={c.c}
            type="button"
            onClick={() => navigate(`char/${c.c}`)}
            className={`flex aspect-square flex-col items-center justify-center rounded-xl border transition active:scale-95 ${MASTERY_STYLE[mastery(statMap?.get(`char:${c.c}`))]}`}
          >
            <Zh className="text-2xl leading-none sm:text-3xl">{c.c}</Zh>
            <Pinyin text={c.p} className="mt-0.5 text-[10px]" />
          </button>
        ))}
      </div>
    </div>
  )
}
