import HanziWriter, { type CharacterJson } from 'hanzi-writer'
import { useEffect, useRef, useState } from 'react'

/** public/strokes/글자.json (hanzi-writer-data) 을 읽는다. 서비스 워커가 미리 받아 두므로 오프라인에서도 동작 */
function loadStrokes(char: string, onLoad: (d: CharacterJson) => void, onError: (e?: unknown) => void): void {
  fetch(`${import.meta.env.BASE_URL}strokes/${encodeURIComponent(char)}.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json() as Promise<CharacterJson>
    })
    .then(onLoad, onError)
}

/**
 * 필순 보기(animate) 또는 따라 쓰기(quiz)
 * 따라 쓰기는 획 순서·방향이 맞아야 넘어가고, 두 번 틀리면 힌트를 보여준다
 */
export function StrokeWriter({
  char,
  mode,
  replay = 0,
  outline = true,
  onStrokes,
  onComplete,
}: {
  char: string
  mode: 'animate' | 'quiz'
  /** 값이 바뀌면 처음부터 다시 */
  replay?: number
  /** 따라 쓰기에서 연한 글자 모양 보여주기 */
  outline?: boolean
  onStrokes?: (count: number) => void
  onComplete?: (mistakes: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)
  // 콜백은 최신 것을 쓰되, 바뀐다고 글자를 다시 그리지는 않는다
  const callbacks = useRef({ onStrokes, onComplete })
  callbacks.current = { onStrokes, onComplete }

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.innerHTML = ''
    setFailed(false)
    const size = Math.max(120, el.clientWidth)
    const writer = HanziWriter.create(el, char, {
      width: size,
      height: size,
      padding: size * 0.05,
      showOutline: mode === 'animate' || outline,
      showCharacter: false,
      strokeColor: '#1e293b',
      outlineColor: '#e2e8f0',
      drawingColor: '#dc2626',
      highlightColor: '#f59e0b',
      drawingWidth: Math.max(8, size / 16),
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 300,
      charDataLoader: loadStrokes,
      onLoadCharDataSuccess: (data) => callbacks.current.onStrokes?.(data.strokes.length),
      onLoadCharDataError: () => setFailed(true),
    })
    if (mode === 'animate') {
      writer.animateCharacter()
    } else {
      writer.quiz({
        showHintAfterMisses: 2,
        onComplete: (s) => callbacks.current.onComplete?.(s.totalMistakes),
      })
    }
    return () => {
      writer.cancelQuiz()
      el.innerHTML = ''
    }
  }, [char, mode, replay, outline])

  return (
    <div className="relative aspect-square w-full rounded-2xl border border-slate-200 bg-white">
      {/* 米자 모양 안내선 */}
      <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
        <g stroke="#fecaca" strokeWidth={0.4} strokeDasharray="2 2">
          <line x1="50" y1="0" x2="50" y2="100" />
          <line x1="0" y1="50" x2="100" y2="50" />
          <line x1="0" y1="0" x2="100" y2="100" />
          <line x1="100" y1="0" x2="0" y2="100" />
        </g>
      </svg>
      <div ref={ref} className={`absolute inset-0 ${mode === 'quiz' ? 'touch-none' : ''}`} />
      {failed && <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-slate-400">필순 데이터를 불러오지 못했어요</div>}
    </div>
  )
}
