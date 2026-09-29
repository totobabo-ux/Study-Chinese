import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Face, StudyCard } from '../lib/cards'
import { db, recordAnswer, type Stat } from '../lib/db'
import { normalizeInput, stripTones, toNumbered } from '../lib/pinyin'
import { Session, shuffle, type Choice, type Question, type SessionConfig } from '../lib/session'
import { speak } from '../lib/speech'
import { useShowPinyin } from '../lib/storage'
import { Pinyin } from './Pinyin'
import { Zh } from './Zh'

/** 글자 수에 따라 크기를 줄인다 */
function textSize(face: Face, big: boolean): string {
  const len = face.text.length
  if (big) {
    if (!face.zh) return len > 12 ? 'text-2xl' : len > 6 ? 'text-3xl' : 'text-4xl'
    return len <= 1 ? 'text-8xl sm:text-9xl' : len <= 2 ? 'text-7xl' : len <= 4 ? 'text-6xl' : len <= 7 ? 'text-4xl' : 'text-2xl'
  }
  if (!face.zh) return len > 14 ? 'text-sm' : len > 8 ? 'text-base' : 'text-xl'
  return len <= 2 ? 'text-4xl' : len <= 4 ? 'text-2xl' : len <= 7 ? 'text-xl' : 'text-base'
}

function FaceView({ face, big, pinyin }: { face: Face; big?: boolean; pinyin?: boolean }) {
  return (
    <>
      {pinyin && face.pinyin && <Pinyin text={face.pinyin} className={big ? 'mb-1 text-xl' : 'text-xs'} />}
      {face.zh ? (
        <Zh className={`${textSize(face, !!big)} break-all text-center leading-tight`}>{face.text}</Zh>
      ) : (
        <span className={`font-semibold ${textSize(face, !!big)} break-keep text-center leading-tight`}>{face.text}</span>
      )}
      {face.sub && <span className={`${big ? 'mt-1 text-lg' : 'text-xs'} break-keep text-center text-slate-500`}>{face.sub}</span>}
    </>
  )
}

const PROMPT: Record<string, string> = {
  'fb:char': '발음과 뜻을 고르세요',
  fb: '뜻을 고르세요',
  bf: '알맞은 중국어를 고르세요',
  lf: '들리는 말을 고르세요',
  lb: '들리는 말의 뜻을 고르세요',
  tn: '들리는 성조를 고르세요',
  ls: '들리는 소리를 고르세요',
  ar: '뜻에 맞게 단어를 순서대로 놓으세요',
  ty: '병음을 입력하세요',
}

interface Answered {
  ok: boolean
  /** 객관식에서 고른 보기 */
  key?: string
  /** 입력·배열 문제의 안내 */
  message?: string
}

export function QuizRunner({ config, onExit }: { config: SessionConfig; onExit: () => void }) {
  const [session, setSession] = useState<Session | null>(null)
  const [question, setQuestion] = useState<Question | null>(null)
  const [answered, setAnswered] = useState<Answered | null>(null)
  const [done, setDone] = useState(false)
  /** 문제 번호 (입력 영역을 문제마다 새로 만들기 위한 키) */
  const [qNo, setQNo] = useState(0)
  const [showPinyin, setShowPinyin] = useShowPinyin()

  const start = useCallback(async () => {
    const stats = await db.stats.bulkGet(config.cards.map((c) => c.id))
    const s = new Session(config, new Map(stats.filter((x): x is Stat => !!x).map((x) => [x.id, x])))
    setSession(s)
    setQuestion(s.next())
    setQNo((n) => n + 1)
    setAnswered(null)
    setDone(false)
  }, [config])

  useEffect(() => {
    start()
  }, [start])

  // 듣기 문제는 바뀔 때마다 자동 재생
  useEffect(() => {
    if (question && ['lf', 'lb', 'tn', 'ls'].includes(question.direction)) speak(question.card.speak)
  }, [question])

  const advance = useCallback(() => {
    if (!session) return
    const q = session.next()
    if (q) {
      setQuestion(q)
      setQNo((n) => n + 1)
      setAnswered(null)
    } else {
      setDone(true)
    }
  }, [session])

  const submit = useCallback(
    (result: Answered) => {
      if (!question || !session || answered) return
      setAnswered(result)
      speak(question.card.speak)
      session.answer(question.card, result.ok)
      recordAnswer(question.card.id, result.ok)
    },
    [question, session, answered],
  )

  const choose = useCallback((c: Choice) => submit({ ok: c.correct, key: c.key }), [submit])

  // 정답이면 잠시 후 자동으로 다음 문제
  useEffect(() => {
    if (answered?.ok) {
      const t = setTimeout(advance, question?.card.kind === 'sent' ? 1600 : 900)
      return () => clearTimeout(t)
    }
  }, [answered, question, advance])

  // PC 키보드: 1~4 선택, Enter 다음
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!question || done) return
      if (e.target instanceof HTMLInputElement && !answered) return
      const n = Number(e.key)
      if (!answered && n >= 1 && n <= question.choices.length) choose(question.choices[n - 1])
      else if (e.key === 'Enter' && answered) {
        e.preventDefault()
        advance()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [question, answered, done, choose, advance])

  if (!session) return null
  if (done) return <QuizResult session={session} onRetry={start} onExit={onExit} />
  if (!question) return null

  const { card, direction, choices } = question
  const listening = ['lf', 'lb', 'tn', 'ls'].includes(direction)
  const prompt = PROMPT[`${direction}:${card.kind}`] ?? PROMPT[direction]

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onExit} className="text-sm text-slate-500 hover:text-slate-700">
          ✕ 그만하기
        </button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full bg-red-500 transition-all" style={{ width: `${(session.answered / session.total) * 100}%` }} />
        </div>
        <button
          type="button"
          onClick={() => setShowPinyin(!showPinyin)}
          title="병음 보기"
          className={`rounded-md border px-1.5 py-0.5 text-xs font-semibold ${showPinyin ? 'border-red-300 bg-red-50 text-red-600' : 'border-slate-200 text-slate-400'}`}
        >
          pīn
        </button>
        <span className="text-sm tabular-nums text-slate-500">
          {Math.min(session.answered + (answered ? 0 : 1), session.total)}/{session.total}
        </span>
      </div>

      <div className="flex min-h-56 flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white px-4 py-8 shadow-sm">
        <div className="mb-3 text-xs font-medium text-slate-400">{prompt}</div>
        {listening ? (
          <SpeakerButton text={card.speak} />
        ) : direction === 'ar' ? (
          <div className="flex flex-col items-center gap-2">
            <span className="break-keep text-center text-xl font-semibold">{card.back.text}</span>
            <button type="button" onClick={() => speak(card.speak)} className="text-sm text-slate-400 hover:text-red-500">
              🔊 듣기
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* 한자 발음 문제와 입력 문제는 병음을 숨긴다 */}
            <FaceView face={direction === 'bf' ? card.back : card.front} big pinyin={showPinyin && !(card.kind === 'char' && direction === 'fb') && direction !== 'ty'} />
            {direction === 'ty' && <span className="mt-2 text-slate-500">{card.back.sub ?? card.back.text}</span>}
            {direction === 'fb' && card.kind === 'word' && (
              <button type="button" onClick={() => speak(card.speak)} className="mt-3 text-sm text-slate-400 hover:text-red-500">
                🔊 듣기
              </button>
            )}
          </div>
        )}
        {answered && <Reveal card={card} message={answered.message} />}
      </div>

      {direction === 'ar' ? (
        <ArrangeInput key={qNo} tokens={card.tokens ?? []} disabled={!!answered} onSubmit={submit} />
      ) : direction === 'ty' ? (
        <TypeInput key={qNo} card={card} disabled={!!answered} onSubmit={submit} />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {choices.map((c, i) => {
            let style = 'border-slate-200 bg-white hover:border-red-300'
            if (answered) {
              if (c.correct) style = 'border-emerald-400 bg-emerald-50 text-emerald-700'
              else if (c.key === answered.key) style = 'border-red-400 bg-red-50 text-red-700'
              else style = 'border-slate-200 bg-white opacity-50'
            }
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => choose(c)}
                disabled={answered !== null}
                className={`relative flex min-h-20 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 p-3 transition active:scale-95 ${style}`}
              >
                <span className="absolute left-2.5 top-1.5 hidden text-xs text-slate-300 sm:block">{i + 1}</span>
                {c.face.zh ? <FaceView face={c.face} pinyin={showPinyin && direction !== 'lf'} /> : <ChoiceText face={c.face} />}
              </button>
            )
          })}
        </div>
      )}

      {answered && !answered.ok && (
        <button type="button" onClick={advance} className="w-full rounded-2xl bg-slate-800 py-4 text-lg font-bold text-white active:scale-[0.98]">
          다음 <span className="hidden text-sm font-normal text-slate-400 sm:inline">(Enter)</span>
        </button>
      )}
    </div>
  )
}

/** 뜻·병음 보기. 병음처럼 보이면 성조 색을 입힌다 */
function ChoiceText({ face }: { face: Face }) {
  const isPinyin = /^[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü' ]+$/i.test(face.text)
  return (
    <>
      {isPinyin ? <Pinyin text={face.text} className="text-2xl font-semibold" /> : <span className={`break-keep text-center font-semibold ${face.text.length > 14 ? 'text-sm' : face.text.length > 8 ? 'text-base' : 'text-xl'}`}>{face.text}</span>}
      {face.sub && <span className="break-keep text-center text-xs text-slate-500">{face.sub}</span>}
    </>
  )
}

function SpeakerButton({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-slate-500">
      <button type="button" onClick={() => speak(text)} className="flex size-24 items-center justify-center rounded-full bg-red-100 text-5xl active:scale-95">
        🔊
      </button>
      <button type="button" onClick={() => speak(text, true)} className="text-sm hover:text-red-500">
        🐢 천천히 듣기
      </button>
    </div>
  )
}

/** 답을 낸 뒤 보여주는 정답 정보 */
function Reveal({ card, message }: { card: StudyCard; message?: string }) {
  const meaning = card.kind === 'char' ? card.back.sub : card.kind === 'tone' ? undefined : card.back.text
  return (
    <div className="mt-4 flex flex-col items-center gap-0.5 text-center">
      {message && <span className="mb-1 text-sm font-medium text-amber-600">{message}</span>}
      <Pinyin text={card.pinyin} className="text-lg" />
      <Zh className="text-2xl text-slate-700">{card.front.text}</Zh>
      {meaning && <span className="break-keep text-sm text-slate-500">{meaning}</span>}
    </div>
  )
}

/* ------------------------------- 어순 배열 ------------------------------- */

function ArrangeInput({ tokens, disabled, onSubmit }: { tokens: string[]; disabled: boolean; onSubmit: (a: Answered) => void }) {
  // 같은 단어가 두 번 나올 수 있으니 위치(번호)로 관리한다
  const order = useMemo(() => {
    const idx = tokens.map((_, i) => i)
    let s = shuffle(idx)
    // 섞었는데 그대로면 한 번 더
    for (let tries = 0; tries < 5 && tokens.length > 1 && s.every((v, i) => tokens[v] === tokens[i]); tries++) s = shuffle(idx)
    return s
  }, [tokens])
  const [placed, setPlaced] = useState<number[]>([])

  useEffect(() => {
    if (!disabled && placed.length === tokens.length && tokens.length > 0) {
      const ok = placed.map((i) => tokens[i]).join('') === tokens.join('')
      onSubmit({ ok, message: ok ? undefined : '정답 순서를 확인하세요' })
    }
  }, [placed, tokens, disabled, onSubmit])

  return (
    <div className="space-y-4">
      <div className="flex min-h-16 flex-wrap content-start gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-3">
        {placed.length === 0 && <span className="self-center text-sm text-slate-400">아래 단어를 순서대로 눌러요</span>}
        {placed.map((i, pos) => (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => setPlaced(placed.filter((_, p) => p !== pos))}
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xl"
          >
            <Zh>{tokens[i]}</Zh>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {order.map((i) => (
          <button
            key={i}
            type="button"
            disabled={disabled || placed.includes(i)}
            onClick={() => setPlaced([...placed, i])}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xl shadow-sm transition active:scale-95 disabled:opacity-25"
          >
            <Zh>{tokens[i]}</Zh>
          </button>
        ))}
      </div>
      {!disabled && (
        <button type="button" onClick={() => onSubmit({ ok: false })} className="w-full text-sm text-slate-400 hover:text-slate-600">
          모르겠어요
        </button>
      )}
    </div>
  )
}

/* ------------------------------- 병음 입력 ------------------------------- */

function TypeInput({ card, disabled, onSubmit }: { card: StudyCard; disabled: boolean; onSubmit: (a: Answered) => void }) {
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const check = () => {
    if (!value.trim()) return
    const expected = toNumbered(card.pinyin)
    const got = normalizeInput(value)
    if (got === expected) onSubmit({ ok: true })
    else if (stripTones(got) === stripTones(expected)) onSubmit({ ok: false, message: '소리는 맞았어요! 성조를 확인하세요' })
    else onSubmit({ ok: false })
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          check()
        }}
        className="flex gap-2"
      >
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          placeholder="예: ni3hao3"
          className="min-w-0 flex-1 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-xl outline-none focus:border-red-400"
        />
        <button type="submit" disabled={disabled} className="rounded-2xl bg-red-600 px-5 font-bold text-white disabled:bg-slate-300">
          확인
        </button>
      </form>
      <p className="text-center text-xs text-slate-400">성조는 음절 뒤에 숫자로 (1~4, 경성은 생략 또는 5). ü는 v로 입력해요.</p>
    </div>
  )
}

/* --------------------------------- 결과 --------------------------------- */

function QuizResult({ session, onRetry, onExit }: { session: Session; onRetry: () => void; onExit: () => void }) {
  const { score, answered, wrong, config } = session
  const pct = answered ? Math.round((score / answered) * 100) : 0
  const reported = useRef(false)
  useEffect(() => {
    if (!reported.current) {
      reported.current = true
      config.onFinish?.(pct)
    }
  }, [config, pct])

  const message = pct === 100 ? '완벽해요! 🎉' : pct >= 80 ? '아주 잘했어요! 👏' : pct >= 50 ? '좋아요, 조금만 더! 💪' : '반복하면 금방 늘어요 🌱'

  return (
    <div className="space-y-6 text-center">
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        {config.title && <div className="mb-2 text-sm font-medium text-slate-500">{config.title}</div>}
        <div className="text-5xl font-bold tabular-nums text-red-600">
          {score}
          <span className="text-2xl text-slate-400"> / {answered}</span>
        </div>
        <div className="mt-2 text-lg">{message}</div>
        {config.onFinish && (
          <div className={`mt-3 rounded-xl px-3 py-2 text-sm font-semibold ${pct >= 80 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {pct >= 80 ? '✅ 통과! 다음 단원이 열렸어요' : `통과 기준은 80%예요 (지금 ${pct}%)`}
          </div>
        )}
      </div>

      {wrong.length > 0 && (
        <div className="space-y-2 text-left">
          <h2 className="font-semibold text-slate-700">틀린 문제 (눌러서 발음 듣기)</h2>
          <div className="flex flex-wrap gap-2">
            {wrong.map((c) => (
              <button key={c.id} type="button" onClick={() => speak(c.speak)} className="flex flex-col items-center rounded-xl border border-red-200 bg-red-50 px-4 py-2">
                <Pinyin text={c.pinyin} className="text-xs" />
                <Zh className="text-2xl">{c.front.text}</Zh>
                <span className="max-w-48 break-keep text-xs text-slate-500">{c.kind === 'char' ? c.back.sub : c.kind === 'tone' ? '' : c.back.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button type="button" onClick={onExit} className="rounded-2xl border border-slate-300 bg-white py-4 font-bold text-slate-700">
          돌아가기
        </button>
        <button type="button" onClick={onRetry} className="rounded-2xl bg-red-600 py-4 font-bold text-white">
          다시 하기
        </button>
      </div>
    </div>
  )
}
