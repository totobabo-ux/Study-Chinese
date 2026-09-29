import { useState } from 'react'
import { Pinyin } from '../components/Pinyin'
import { Segmented } from '../components/Segmented'
import { StrokeWriter } from '../components/StrokeWriter'
import { Zh } from '../components/Zh'
import { BackLink, WordRow } from '../components/common'
import { CHARS_IN_ORDER as CHARS, CHAR_MAP, UNIT_OF_CHAR, wordId, wordsWithChar } from '../data'
import { mastery } from '../lib/db'
import { useStatMap } from '../lib/progress'
import { speak } from '../lib/speech'
import { usePersistentState } from '../lib/storage'

export function CharPage({ c }: { c?: string }) {
  const ch = c ? decodeURIComponent(c) : ''
  const info = CHAR_MAP.get(ch)
  const statMap = useStatMap()
  const [mode, setMode] = usePersistentState<'animate' | 'quiz'>('char.mode', 'animate')
  const [outline, setOutline] = usePersistentState('char.outline', true)
  const [replay, setReplay] = useState(0)
  const [strokes, setStrokes] = useState<number | null>(null)
  const [result, setResult] = useState<string>('')

  if (!info) {
    return (
      <div className="space-y-4">
        <BackLink label="뒤로" onClick={() => history.back()} />
        <p className="text-slate-500">한자 정보를 찾을 수 없어요.</p>
      </div>
    )
  }

  // 배우는 순서대로 앞뒤 글자로 이동
  const index = CHARS.indexOf(info)
  const go = (d: number) => {
    const next = CHARS[(index + d + CHARS.length) % CHARS.length]
    setResult('')
    setStrokes(null)
    location.replace(`#/char/${next.c}`)
  }
  const words = wordsWithChar(ch)
  const unit = UNIT_OF_CHAR.get(ch)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <BackLink label="뒤로" onClick={() => history.back()} />
        <div className="flex gap-2">
          <button type="button" onClick={() => go(-1)} className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm">
            ← 이전
          </button>
          <button type="button" onClick={() => go(1)} className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm">
            다음 →
          </button>
        </div>
      </div>

      <header className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <button type="button" onClick={() => speak(ch)} className="flex flex-col items-center">
          <Pinyin text={info.p} className="text-xl" />
          <Zh className="text-7xl leading-none">{ch}</Zh>
        </button>
        <div className="min-w-0 flex-1 space-y-1 text-sm">
          <div className="text-lg font-bold text-slate-800">{info.m}</div>
          {info.hun && (
            <div className="text-slate-600">
              한국 한자: <b>{info.hun}</b>
            </div>
          )}
          {info.t && (
            <div className="text-slate-600">
              번체자: <span className="text-2xl">{info.t}</span>
            </div>
          )}
          <div className="text-xs text-slate-400">
            {strokes !== null && `${strokes}획 · `}
            {unit ? `${unit}과에서 처음 배워요` : ''}
          </div>
          <button type="button" onClick={() => speak(ch)} className="text-sm text-red-600">
            🔊 발음 듣기
          </button>
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Segmented
            value={mode}
            onChange={(v) => {
              setMode(v)
              setResult('')
            }}
            options={[
              { value: 'animate', label: '필순 보기' },
              { value: 'quiz', label: '따라 쓰기' },
            ]}
          />
          {mode === 'quiz' && (
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={outline} onChange={(e) => setOutline(e.target.checked)} className="size-4 accent-red-600" />
              연한 글자 보기
            </label>
          )}
        </div>
        <div className="mx-auto max-w-sm">
          <StrokeWriter
            key={`${ch}-${mode}`}
            char={ch}
            mode={mode}
            replay={replay}
            outline={outline}
            onStrokes={setStrokes}
            onComplete={(m) => setResult(m === 0 ? '🎉 완벽해요! 한 번도 틀리지 않았어요' : `✅ 완성! 틀린 획 ${m}번`)}
          />
        </div>
        <p className="text-center text-sm text-slate-500">
          {mode === 'animate' ? '획을 쓰는 순서를 보여줘요.' : result || '획 순서대로 따라 써 보세요. 두 번 틀리면 힌트가 나와요.'}
        </p>
        <button
          type="button"
          onClick={() => {
            setResult('')
            setReplay((r) => r + 1)
          }}
          className="mx-auto block rounded-xl border border-slate-200 bg-white px-6 py-2 text-sm font-medium"
        >
          {mode === 'animate' ? '▶ 다시 보기' : '↺ 다시 쓰기'}
        </button>
      </section>

      <section className="space-y-2">
        <h2 className="font-semibold text-slate-700">이 글자가 들어간 단어 ({words.length})</h2>
        <ul className="space-y-1.5">
          {words.map(({ word, unit }) => (
            <WordRow key={wordId(word)} w={word} mastery={mastery(statMap?.get(wordId(word)))} right={<span className="shrink-0 text-xs text-slate-400">{unit}과</span>} />
          ))}
        </ul>
      </section>

      <p className="text-xs text-slate-400">
        필순 데이터:{' '}
        <a href="https://github.com/chanind/hanzi-writer-data" target="_blank" rel="noreferrer" className="underline">
          hanzi-writer-data
        </a>{' '}
        (Make Me a Hanzi, Arphic Public License)
      </p>
    </div>
  )
}
