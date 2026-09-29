import { useMemo, useState } from 'react'
import { Pinyin } from '../components/Pinyin'
import { QuizRunner } from '../components/QuizRunner'
import { SoundLessonView, SyllableButton } from '../components/SoundLessonView'
import { Tabs } from '../components/Tabs'
import { ToneChart } from '../components/ToneChart'
import { Zh } from '../components/Zh'
import { BigButton } from '../components/common'
import { ALL_WORDS, SOUND_LESSONS, UNITS } from '../data'
import SYLLABLE_CHARS from '../data/syllables.json'
import { WORD_CARDS, toneCard, toneQuizable, type StudyCard } from '../lib/cards'
import { markTone, syllablesOf } from '../lib/pinyin'
import type { SessionConfig } from '../lib/session'
import { speak } from '../lib/speech'

const TABS = [
  { id: 'table', label: '병음표' },
  { id: 'tones', label: '성조' },
  { id: 'lessons', label: '발음 레슨' },
]

export function SoundPage({ tab = 'table' }: { tab?: string }) {
  const [config, setConfig] = useState<SessionConfig | null>(null)
  if (config) return <QuizRunner config={config} onExit={() => setConfig(null)} />
  return (
    <div>
      <h1 className="mb-3 text-2xl font-bold">발음</h1>
      <Tabs base="sound" current={tab} tabs={TABS} />
      {tab === 'table' && <PinyinTable onStart={setConfig} />}
      {tab === 'tones' && <Tones onStart={setConfig} />}
      {tab === 'lessons' && <Lessons />}
    </div>
  )
}

/* -------------------------------- 병음표 -------------------------------- */

const INITIALS = ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'zh', 'ch', 'sh', 'r', 'z', 'c', 's', 'y', 'w']
const SYLLABLES = SYLLABLE_CHARS as Record<string, (string | null)[]>

function initialOf(syl: string): string {
  if (/^(zh|ch|sh)/.test(syl)) return syl.slice(0, 2)
  return INITIALS.includes(syl[0]) ? syl[0] : ''
}

function PinyinTable({ onStart }: { onStart: (c: SessionConfig) => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const groups = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const syl of Object.keys(SYLLABLES)) {
      const ini = initialOf(syl)
      map.set(ini, [...(map.get(ini) ?? []), syl])
    }
    return ['', ...INITIALS].filter((i) => map.has(i)).map((i) => ({ initial: i, syllables: map.get(i)! }))
  }, [])

  const quizAll = () => {
    // 모든 음절·성조 중 무작위 (대표 한자가 있는 것만)
    const cards = Object.keys(SYLLABLES)
      .flatMap((syl) => [1, 2, 3, 4].map((t) => toneCard(`${syl}${t}`)))
      .filter((c): c is StudyCard => !!c)
    onStart({ cards, directions: { tone: ['tn'] }, mode: { type: 'practice', count: 20 } })
  }

  return (
    <div className="space-y-4 pt-4">
      <p className="text-sm text-slate-500">중국어의 모든 음절이에요. 음절을 누르면 1~4성으로 들어 볼 수 있어요. (소리는 그 음을 가진 대표 한자로 재생돼요)</p>
      {groups.map((g) => (
        <section key={g.initial} className="space-y-1.5">
          <h2 className="text-sm font-bold text-slate-600">{g.initial ? `${g.initial} 로 시작` : '성모 없음'}</h2>
          <div className="flex flex-wrap gap-1.5">
            {g.syllables.map((syl) => (
              <button
                key={syl}
                type="button"
                onClick={() => setSelected(selected === syl ? null : syl)}
                className={`rounded-lg border px-2.5 py-1.5 text-sm font-medium transition ${selected === syl ? 'border-red-500 bg-red-500 text-white' : 'border-slate-200 bg-white hover:border-red-300'}`}
              >
                {syl}
              </button>
            ))}
          </div>
        </section>
      ))}
      <BigButton tone="soft" onClick={quizAll}>
        🎵 무작위 음절 성조 퀴즈
      </BigButton>

      {selected && (
        <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-10 px-4">
          <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-lg backdrop-blur">
            <div className="flex flex-1 flex-wrap justify-center gap-2">
              {[1, 2, 3, 4].map((t) => (
                <SyllableButton key={t} py={markTone(selected, t)} />
              ))}
            </div>
            <button type="button" onClick={() => setSelected(null)} className="shrink-0 px-2 text-slate-400">
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* --------------------------------- 성조 --------------------------------- */

/** 두 음절 성조 조합별 예시 단어 (앞 단원 단어 우선) */
function tonePairExamples() {
  const table = new Map<string, { h: string; p: string; m: string }[]>()
  for (const { word } of ALL_WORDS) {
    const syl = syllablesOf(word.p)
    if (syl.length !== 2 || [...word.h].length !== 2 || /[一不]/.test(word.h)) continue
    const key = `${syl[0].tone}-${syl[1].tone}`
    if (syl[0].tone === 5 || key === '3-3') continue
    const list = table.get(key) ?? []
    if (list.length < 2) list.push(word)
    table.set(key, list)
  }
  return table
}

function Tones({ onStart }: { onStart: (c: SessionConfig) => void }) {
  const examples = useMemo(tonePairExamples, [])
  const stage1Words = useMemo(() => {
    const ids = new Set(UNITS.filter((u) => u.stage === 1).map((u) => `u${u.id}`))
    return WORD_CARDS.filter((c) => ids.has(c.group) && toneQuizable(c))
  }, [])

  return (
    <div className="space-y-5 pt-4">
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="font-bold">네 가지 성조</h2>
        <ToneChart />
        <p className="text-sm leading-relaxed text-slate-600">
          성조는 중국어 발음의 절반이에요. 처음엔 과장될 만큼 크게 높낮이를 넣어 연습하세요. 병음 색은 성조를 나타내요:{' '}
          <span className="tone-1 font-semibold">1성</span> · <span className="tone-2 font-semibold">2성</span> · <span className="tone-3 font-semibold">3성</span> ·{' '}
          <span className="tone-4 font-semibold">4성</span> · <span className="tone-5 font-semibold">경성</span>
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">두 음절 성조 조합</h2>
        <p className="text-sm text-slate-500">실제 단어는 대부분 두 음절이에요. 조합별 예시 단어를 눌러 리듬을 익혀 보세요. (3성+3성은 변조가 일어나서 뺐어요)</p>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((a) => (
            <div key={a} className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((b) => {
                const list = examples.get(`${a}-${b}`) ?? []
                return (
                  <div key={b} className="min-w-0 rounded-xl border border-slate-200 bg-white p-1.5 text-center">
                    <div className="text-[10px] font-bold text-slate-400">
                      <span className={`tone-${a}`}>{a}</span>+<span className={`tone-${b}`}>{b === 5 ? '경' : b}</span>
                    </div>
                    {a === 3 && b === 3 && <div className="py-2 text-[10px] leading-tight text-slate-400">변조로 2+3처럼 읽어요</div>}
                    {list.map((w) => (
                      <button key={w.h} type="button" onClick={() => speak(w.h)} className="block w-full rounded-md py-0.5 hover:bg-red-50">
                        <Zh className="block text-base leading-tight">{w.h}</Zh>
                        <Pinyin text={w.p} className="block truncate text-[10px]" />
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </section>

      <BigButton onClick={() => onStart({ cards: stage1Words, directions: { word: ['tn'] }, mode: { type: 'practice', count: 20 } })}>🎵 1단계 단어로 성조 듣기 퀴즈</BigButton>
    </div>
  )
}

/* ------------------------------- 발음 레슨 ------------------------------- */

function Lessons() {
  const [open, setOpen] = useState<string>('')
  return (
    <div className="space-y-3 pt-4">
      <p className="text-sm text-slate-500">학습 탭의 발음 단원과 같은 내용이에요. 언제든 다시 찾아볼 수 있어요.</p>
      {SOUND_LESSONS.map((l, i) => (
        <section key={l.id} className="rounded-2xl border border-slate-200 bg-white">
          <button type="button" onClick={() => setOpen(open === l.id ? '' : l.id)} className="flex w-full items-center justify-between p-4 text-left">
            <span>
              <span className="block text-xs text-slate-400">발음 {i + 1}</span>
              <span className="font-semibold">{l.title}</span>
            </span>
            <span className="text-slate-400">{open === l.id ? '▲' : '▼'}</span>
          </button>
          {open === l.id && (
            <div className="px-3 pb-3">
              <SoundLessonView lesson={l} />
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
