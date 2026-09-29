import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { Segmented } from '../components/Segmented'
import { ALL_WORDS, CHARS_IN_ORDER, COURSE, courseLabel, wordId } from '../data'
import { dayKey, db, exportStats, importStats, mastery, resetStats, studyStreak, type DayLog } from '../lib/db'
import { useCourseState, useStatMap } from '../lib/progress'
import { navigate } from '../lib/router'
import { hasChineseVoice, isSpeechSupported, speak } from '../lib/speech'
import { usePersistentState, useShowPinyin, useSpeechRate, useToneColors, useUnlockAll, type SpeechRate } from '../lib/storage'

const GOALS = [10, 20, 50, 100]
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

export function Home({ dueCount }: { dueCount: number }) {
  const days = useLiveQuery(() => db.days.toArray(), [])
  const state = useCourseState()
  const statMap = useStatMap()
  const charsMastered = CHARS_IN_ORDER.filter((c) => mastery(statMap?.get(`char:${c.c}`)) === 'mastered').length
  const wordsMastered = ALL_WORDS.filter(({ word }) => mastery(statMap?.get(wordId(word))) === 'mastered').length
  const current = state.current
  const allDone = state.passedCount === COURSE.length

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold">
          <span lang="zh-CN" className="font-zh text-red-600">
            中文
          </span>{' '}
          공부
        </h1>
        <p className="mt-1 text-sm text-slate-500">병음과 성조부터, 한 단원씩 차근차근.</p>
      </header>

      {state.loaded && (
        <button
          type="button"
          onClick={() => navigate(`unit/${current.id}`)}
          className="flex w-full items-center justify-between gap-3 rounded-3xl bg-red-600 px-5 py-5 text-left text-white shadow-sm active:scale-[0.98]"
        >
          <span className="min-w-0">
            <span className="block text-sm text-red-100">{allDone ? '🎉 전체 과정 완료! 복습해 볼까요?' : state.passedCount === 0 ? '여기서 시작해요' : '이어서 학습하기'}</span>
            <span className="block text-xs text-red-200">{courseLabel(current)}</span>
            <span className="block truncate text-xl font-bold">{current.title}</span>
          </span>
          <span className="shrink-0 text-3xl">→</span>
        </button>
      )}

      {days && <TodayCard days={days} />}

      {dueCount > 0 && (
        <button
          type="button"
          onClick={() => navigate('review')}
          className="flex w-full items-center justify-between rounded-2xl border border-red-200 bg-white px-5 py-4 text-left shadow-sm active:scale-[0.98]"
        >
          <span>
            <span className="block font-bold">🔁 오늘의 복습</span>
            <span className="text-sm text-slate-500">잊기 전에 다시 보면 오래 기억해요</span>
          </span>
          <span className="text-3xl font-bold tabular-nums text-red-600">{dueCount}</span>
        </button>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <ProgressCard label="단원" value={state.passedCount} total={COURSE.length} unit="개 통과" color="bg-red-500" />
        <ProgressCard label="한자" value={charsMastered} total={CHARS_IN_ORDER.length} unit="자 익힘" color="bg-emerald-500" />
        <ProgressCard label="단어" value={wordsMastered} total={ALL_WORDS.length} unit="개 익힘" color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickLink icon="拼" label="병음표" onClick={() => navigate('sound/table')} />
        <QuickLink icon="🎵" label="성조 연습" onClick={() => navigate('sound/tones')} />
        <QuickLink icon="字" label="한자 목록" onClick={() => navigate('dict/chars')} />
        <QuickLink icon="✏️" label="자유 연습" onClick={() => navigate('review/practice')} />
      </div>

      <VoiceNotice />
      <InstallGuide />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-600">
        <h2 className="mb-2 font-semibold text-slate-800">📚 이렇게 공부해요</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>발음 6단원에서 성조와 병음을 먼저 익혀요. 중국어는 성조가 절반이에요!</li>
          <li>각 단원은 한자 → 단어 → 문법 → 문장 순서로 보고, 탭마다 있는 퀴즈를 풀어요.</li>
          <li>단원 테스트를 80% 이상 맞히면 다음 단원이 열려요.</li>
          <li>매일 "오늘의 복습"을 먼저 끝내고 새 단원으로 넘어가요.</li>
          <li>한자는 필순을 따라 써 보면 훨씬 잘 외워져요. 한국 한자음(예: 学 = 배울 학)도 함께 보세요.</li>
        </ol>
      </section>

      <Settings />
      <Backup />
    </div>
  )
}

function ProgressCard({ label, value, total, unit, color }: { label: string; value: number; total: number; unit: string; color: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold">{label}</span>
        <span className="text-xs tabular-nums text-slate-500">
          {value} / {total}
          {unit}
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${total ? (value / total) * 100 : 0}%` }} />
      </div>
    </div>
  )
}

function QuickLink({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-2xl border border-slate-200 bg-white py-4 font-semibold shadow-sm active:scale-[0.98]">
      <span lang="zh-CN" className="font-zh mb-1 block text-2xl text-red-600">
        {icon}
      </span>
      <span className="text-sm">{label}</span>
    </button>
  )
}

function TodayCard({ days }: { days: DayLog[] }) {
  const [goal, setGoal] = usePersistentState('home.goal', 20)
  const byDate = new Map(days.map((d) => [d.date, d]))
  const today = byDate.get(dayKey())?.answers ?? 0
  const streak = studyStreak(days)
  const pct = Math.min(100, (today / goal) * 100)

  // 최근 7일
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return { label: WEEKDAYS[d.getDay()], answers: byDate.get(dayKey(d))?.answers ?? 0, isToday: i === 6 }
  })
  const max = Math.max(goal, ...week.map((w) => w.answers))

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">연속 학습</div>
          <div className="text-2xl font-bold">
            🔥 {streak}
            <span className="text-base font-medium text-slate-500">일</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-500">오늘 푼 문제</div>
          <div className="text-2xl font-bold tabular-nums">
            {today}
            <span className="text-base font-medium text-slate-400"> / {goal}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-xs text-slate-500">{pct >= 100 ? '🎉 오늘 목표 달성!' : `목표까지 ${goal - today}문제 남았어요`}</div>

      <div className="mt-4 flex h-20 items-end gap-2">
        {week.map((w, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center gap-1">
            <div className="flex w-full flex-1 items-end">
              <div
                className={`w-full rounded-t-md ${w.answers >= goal ? 'bg-emerald-400' : w.answers > 0 ? 'bg-amber-300' : 'bg-slate-100'}`}
                style={{ height: `${Math.max(6, (w.answers / max) * 100)}%` }}
                title={`${w.answers}문제`}
              />
            </div>
            <span className={`text-[11px] ${w.isToday ? 'font-bold text-red-600' : 'text-slate-400'}`}>{w.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        하루 목표
        {GOALS.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGoal(g)}
            className={`rounded-full border px-2.5 py-1 ${goal === g ? 'border-red-500 bg-red-50 text-red-600' : 'border-slate-200'}`}
          >
            {g}
          </button>
        ))}
      </div>
    </div>
  )
}

function VoiceNotice() {
  const [ok, setOk] = useState(true)
  useEffect(() => {
    // 음성 목록은 비동기로 로드되므로 잠시 후 확인
    const t = setTimeout(() => setOk(isSpeechSupported() && hasChineseVoice()), 1500)
    return () => clearTimeout(t)
  }, [])
  if (ok) return null
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      🔇 이 기기에서 중국어 음성을 찾지 못했어요. 발음이 안 나오면 기기 설정에서 중국어(중국 본토) 음성(TTS)을 설치하거나 Chrome, Edge, Safari 같은 다른 브라우저를 써 보세요.
    </div>
  )
}

function InstallGuide() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone
  if (isStandalone) return null
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  return (
    <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
      📱 <b>앱처럼 설치하기</b>
      <br />
      {isIOS
        ? 'Safari 하단의 공유 버튼(□↑)을 누른 뒤 "홈 화면에 추가"를 선택하세요.'
        : '브라우저 메뉴(⋮)에서 "앱 설치" 또는 "홈 화면에 추가"를 선택하세요. PC Chrome은 주소창 오른쪽의 설치 아이콘을 눌러도 돼요.'}
    </div>
  )
}

function Settings() {
  const [showPinyin, setShowPinyin] = useShowPinyin()
  const [toneColors, setToneColors] = useToneColors()
  const [unlockAll, setUnlockAll] = useUnlockAll()
  const [rate, setRate] = useSpeechRate()
  const check = (label: string, value: boolean, onChange: (v: boolean) => void) => (
    <label className="flex items-center gap-2">
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-red-600" />
      {label}
    </label>
  )
  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
      <summary className="cursor-pointer font-semibold text-slate-800">⚙️ 설정</summary>
      <div className="mt-3 space-y-3">
        {check('한자 위에 병음 보기', showPinyin, setShowPinyin)}
        {check('병음을 성조별 색으로 보기', toneColors, setToneColors)}
        {check('모든 단원 열기 (순서 제한 없이)', unlockAll, setUnlockAll)}
        <div className="flex flex-wrap items-center gap-3">
          말하기 속도
          <Segmented<SpeechRate>
            value={rate}
            onChange={(v) => {
              setRate(v)
              setTimeout(() => speak('你好，我们一起学习中文吧！'), 50)
            }}
            options={[
              { value: 'slow', label: '느리게' },
              { value: 'normal', label: '보통' },
              { value: 'fast', label: '빠르게' },
            ]}
          />
        </div>
      </div>
    </details>
  )
}

function Backup() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)

  const onExport = async () => {
    const blob = new Blob([await exportStats()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `chinese-progress-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    setMessage('백업 파일을 저장했어요.')
  }

  const onImport = async (file: File) => {
    try {
      const n = await importStats(await file.text())
      setMessage(`${n}개 기록을 불러왔어요.`)
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '불러오기에 실패했어요.')
    }
  }

  return (
    <details className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
      <summary className="cursor-pointer font-semibold text-slate-800">💾 학습 기록 관리</summary>
      <p className="mt-2 text-slate-500">학습 기록은 이 기기의 브라우저에만 저장돼요. 다른 기기로 옮길 때는 백업 파일을 내보낸 뒤 그 기기에서 불러오세요.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={onExport} className="rounded-lg border border-slate-300 px-3 py-2">
          내보내기
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg border border-slate-300 px-3 py-2">
          불러오기
        </button>
        {confirmReset ? (
          <button
            type="button"
            onClick={async () => {
              await resetStats()
              setConfirmReset(false)
              setMessage('기록을 모두 지웠어요.')
            }}
            className="rounded-lg bg-red-600 px-3 py-2 text-white"
          >
            정말 지울까요? 한 번 더 누르세요
          </button>
        ) : (
          <button type="button" onClick={() => setConfirmReset(true)} className="rounded-lg border border-red-200 px-3 py-2 text-red-600">
            초기화
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onImport(f)
            e.target.value = ''
          }}
        />
      </div>
      {message && <p className="mt-2 text-emerald-700">{message}</p>}
    </details>
  )
}
