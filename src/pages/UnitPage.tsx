import { useState } from 'react'
import { QuizRunner } from '../components/QuizRunner'
import { SoundLessonView } from '../components/SoundLessonView'
import { Tabs } from '../components/Tabs'
import { Zh } from '../components/Zh'
import { BackLink, BigButton, MASTERY_STYLE, MasteryLegend, SentenceRow, WordRow } from '../components/common'
import { Pinyin } from '../components/Pinyin'
import { COURSE, COURSE_BY_ID, NEW_CHARS, STAGES, courseLabel, wordId, type CourseItem, type SoundLesson, type Unit } from '../data'
import { soundCards, unitCards } from '../lib/cards'
import { PASS_SCORE, mastery, recordUnitTest } from '../lib/db'
import { useCourseState, useStatMap } from '../lib/progress'
import { navigate } from '../lib/router'
import type { SessionConfig } from '../lib/session'
import { useShowPinyin } from '../lib/storage'

export function UnitPage({ id, tab }: { id?: string; tab?: string }) {
  const item = id ? COURSE_BY_ID.get(id) : undefined
  const [config, setConfig] = useState<SessionConfig | null>(null)
  const state = useCourseState()

  if (!item) {
    return (
      <div className="space-y-4">
        <BackLink label="단원 목록" onClick={() => navigate('course')} />
        <p className="text-slate-500">단원을 찾을 수 없어요.</p>
      </div>
    )
  }
  if (config) return <QuizRunner config={config} onExit={() => setConfig(null)} />

  const index = COURSE.indexOf(item)
  const next = COURSE[index + 1]
  const best = state.progress.get(item.id)?.best
  const stage = STAGES.find((s) => s.stage === item.stage)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <BackLink label="단원 목록" onClick={() => navigate('course')} />
        {state.passed(item.id) && <span className="text-xs font-semibold text-emerald-600">✓ 통과 ({best}%)</span>}
      </div>
      <header>
        <div className="text-sm text-slate-500">
          {courseLabel(item)} · {stage?.label}
        </div>
        <h1 className="text-2xl font-bold">{item.title}</h1>
      </header>

      {item.kind === 'sound' ? (
        <SoundUnit item={item} lesson={item.lesson} tab={tab ?? 'learn'} onStart={setConfig} />
      ) : (
        <NormalUnit item={item} unit={item.unit} tab={tab ?? 'chars'} onStart={setConfig} />
      )}

      {next && state.passed(item.id) && (
        <button
          type="button"
          onClick={() => navigate(`unit/${next.id}`)}
          className="flex w-full items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-left"
        >
          <span>
            <span className="block text-xs text-emerald-700">다음 단원</span>
            <span className="font-bold text-emerald-900">
              {courseLabel(next)} {next.title}
            </span>
          </span>
          <span className="text-2xl text-emerald-600">→</span>
        </button>
      )}
    </div>
  )
}

/** 단원 테스트 설정 */
function testConfig(item: CourseItem, cards: SessionConfig['cards'], directions: SessionConfig['directions'], count: number): SessionConfig {
  return {
    cards,
    directions,
    mode: { type: 'practice', count },
    title: `${courseLabel(item)} 테스트`,
    onFinish: (score) => {
      recordUnitTest(item.id, score)
    },
  }
}

function TestTab({ description, best, onStart }: { description: string; best?: number; onStart: () => void }) {
  return (
    <div className="space-y-4 pt-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-600">
        <h2 className="mb-2 text-base font-bold text-slate-800">📝 단원 테스트</h2>
        <p>{description}</p>
        <p className="mt-2">
          <b>{PASS_SCORE}% 이상</b> 맞히면 통과하고 다음 단원이 열려요. 몇 번이든 다시 볼 수 있어요.
        </p>
        {best !== undefined && <p className="mt-2 font-semibold text-slate-800">최고 점수: {best}%</p>}
      </div>
      <BigButton onClick={onStart}>테스트 시작</BigButton>
    </div>
  )
}

/* -------------------------------- 발음 단원 -------------------------------- */

function SoundUnit({ item, lesson, tab, onStart }: { item: CourseItem; lesson: SoundLesson; tab: string; onStart: (c: SessionConfig) => void }) {
  const state = useCourseState()
  const cards = soundCards(lesson.id)
  const hasConfusable = !!lesson.confusable?.length
  const tabs = [
    { id: 'learn', label: '배우기' },
    { id: 'practice', label: '연습' },
    { id: 'test', label: '테스트' },
  ]
  return (
    <div>
      <Tabs base={`unit/${item.id}`} current={tab} tabs={tabs} />
      {tab === 'learn' && (
        <div className="pt-4">
          <SoundLessonView lesson={lesson} />
          <div className="mt-4">
            <BigButton onClick={() => navigate(`unit/${item.id}/practice`)}>연습하러 가기 →</BigButton>
          </div>
        </div>
      )}
      {tab === 'practice' && (
        <div className="space-y-3 pt-4">
          <p className="text-sm text-slate-500">소리를 듣고 알맞은 병음을 골라요. 🐢 버튼으로 천천히 들을 수도 있어요.</p>
          <BigButton onClick={() => onStart({ cards, directions: { tone: ['tn'] }, mode: { type: 'practice', count: 15 } })}>🎵 성조 듣고 고르기</BigButton>
          {hasConfusable && (
            <BigButton tone="soft" onClick={() => onStart({ cards, directions: { tone: ['ls'] }, mode: { type: 'practice', count: 15 } })}>
              👂 비슷한 소리 구분하기
            </BigButton>
          )}
        </div>
      )}
      {tab === 'test' && (
        <TestTab
          description={hasConfusable ? '성조 듣기와 비슷한 소리 구분하기가 섞여서 16문제 나와요.' : '소리를 듣고 성조를 고르는 문제가 16문제 나와요.'}
          best={state.progress.get(item.id)?.best}
          onStart={() => onStart(testConfig(item, cards, { tone: hasConfusable ? ['tn', 'ls'] : ['tn'] }, 16))}
        />
      )}
    </div>
  )
}

/* -------------------------------- 일반 단원 -------------------------------- */

function NormalUnit({ item, unit, tab, onStart }: { item: CourseItem; unit: Unit; tab: string; onStart: (c: SessionConfig) => void }) {
  const state = useCourseState()
  const statMap = useStatMap()
  const [showPinyin, setShowPinyin] = useShowPinyin()
  const chars = NEW_CHARS.get(unit.id) ?? []
  const cards = unitCards(unit.id)
  const tabs = [
    { id: 'chars', label: `한자 ${chars.length}` },
    { id: 'words', label: `단어 ${unit.words.length}` },
    { id: 'grammar', label: '문법' },
    { id: 'sentences', label: '문장' },
    { id: 'test', label: '테스트' },
  ]
  const pinyinToggle = (
    <label className="flex items-center gap-2 text-sm text-slate-600">
      <input type="checkbox" checked={showPinyin} onChange={(e) => setShowPinyin(e.target.checked)} className="size-4 accent-red-600" />
      병음 보기
    </label>
  )

  return (
    <div>
      <Tabs base={`unit/${item.id}`} current={tab} tabs={tabs} />

      {tab === 'chars' && (
        <div className="space-y-4 pt-4">
          {chars.length === 0 ? (
            <p className="text-sm text-slate-500">이 단원에는 새 한자가 없어요. 모두 앞에서 배운 글자로 된 단어예요.</p>
          ) : (
            <>
              <p className="text-sm text-slate-500">이 단원에서 처음 나오는 한자예요. 눌러서 필순·쓰기 연습과 쓰이는 단어를 볼 수 있어요.</p>
              <MasteryLegend />
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {chars.map((c) => (
                  <button
                    key={c.c}
                    type="button"
                    onClick={() => navigate(`char/${c.c}`)}
                    className={`flex flex-col items-center rounded-2xl border px-2 py-3 transition active:scale-95 ${MASTERY_STYLE[mastery(statMap?.get(`char:${c.c}`))]}`}
                  >
                    <Pinyin text={c.p} className="text-sm" />
                    <Zh className="text-4xl leading-tight">{c.c}</Zh>
                    <span className="mt-1 line-clamp-1 text-xs text-slate-500">{c.hun || c.m}</span>
                  </button>
                ))}
              </div>
              <BigButton onClick={() => onStart({ cards: cards.chars, directions: { char: ['fb', 'lf'] }, mode: { type: 'practice', count: Math.min(20, Math.max(10, cards.chars.length * 2)) } })}>
                ✏️ 한자 퀴즈
              </BigButton>
            </>
          )}
        </div>
      )}

      {tab === 'words' && (
        <div className="space-y-4 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-500">눌러서 발음을 들어요.</p>
            {pinyinToggle}
          </div>
          <ul className="space-y-1.5">
            {unit.words.map((w) => (
              <WordRow key={wordId(w)} w={w} mastery={mastery(statMap?.get(wordId(w)))} />
            ))}
          </ul>
          <div className="grid gap-2 sm:grid-cols-3">
            <BigButton onClick={() => onStart({ cards: cards.words, directions: { word: ['fb', 'bf', 'lb'] }, mode: { type: 'practice', count: 20 } })}>📖 단어 퀴즈</BigButton>
            <BigButton tone="soft" onClick={() => onStart({ cards: cards.words, directions: { word: ['tn'] }, mode: { type: 'practice', count: 15 } })}>
              🎵 성조 듣기
            </BigButton>
            <BigButton tone="soft" onClick={() => onStart({ cards: cards.words, directions: { word: ['ty'] }, mode: { type: 'practice', count: 10 } })}>
              ⌨️ 병음 쓰기
            </BigButton>
          </div>
        </div>
      )}

      {tab === 'grammar' && (
        <div className="space-y-4 pt-4">
          <div className="flex justify-end">{pinyinToggle}</div>
          {unit.grammar.map((g, i) => (
            <section key={i} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="font-bold text-slate-800">
                <span className="mr-1 text-red-600">{i + 1}.</span>
                {g.title}
              </h2>
              <div className="space-y-2 text-sm leading-relaxed text-slate-600">
                {g.body.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
              </div>
              <div className="space-y-1.5">
                {g.examples.map((s, j) => (
                  <SentenceRow key={j} s={s} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {tab === 'sentences' && (
        <div className="space-y-4 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-500">이 단원의 단어와 문법으로 만든 문장이에요.</p>
            {pinyinToggle}
          </div>
          <div className="space-y-1.5">
            {unit.sentences.map((s, i) => (
              <SentenceRow key={i} s={s} />
            ))}
          </div>
          <BigButton onClick={() => onStart({ cards: cards.sentences, directions: { sent: ['ar'] }, mode: { type: 'review' } })}>🧩 어순 배열 연습</BigButton>
        </div>
      )}

      {tab === 'test' && (
        <TestTab
          description="이 단원의 한자·단어·문장이 섞여서 20문제 나와요. (뜻 고르기, 듣기, 성조, 어순 배열)"
          best={state.progress.get(item.id)?.best}
          onStart={() =>
            onStart(
              testConfig(item, [...cards.chars, ...cards.words, ...cards.sentences], { char: ['fb', 'lf'], word: ['fb', 'bf', 'lb', 'tn'], sent: ['ar'] }, 20),
            )
          }
        />
      )}
    </div>
  )
}
