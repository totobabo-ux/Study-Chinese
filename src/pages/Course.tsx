import { useEffect, useRef, useState } from 'react'
import { COURSE, NEW_CHARS, STAGES, courseLabel, type CourseItem } from '../data'
import { navigate } from '../lib/router'
import { useCourseState } from '../lib/progress'
import { useUnlockAll } from '../lib/storage'

export function Course() {
  const state = useCourseState()
  const [unlockAll, setUnlockAll] = useUnlockAll()
  const [notice, setNotice] = useState('')
  const currentRef = useRef<HTMLLIElement>(null)

  // 처음 열면 지금 배울 단원으로 스크롤
  useEffect(() => {
    if (state.loaded) currentRef.current?.scrollIntoView({ block: 'center' })
    // 처음 한 번만
  }, [state.loaded])

  const open = (item: CourseItem) => {
    if (state.unlocked(item)) navigate(`unit/${item.id}`)
    else {
      setNotice(`${courseLabel(item)}은 앞 단원 테스트를 통과하면 열려요.`)
      setTimeout(() => setNotice(''), 2500)
    }
  }

  return (
    <div className="space-y-5">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">학습</h1>
        <p className="text-sm text-slate-500">
          발음 6단원 → 1단계(HSK 1급) → 2단계(2급) → 3단계(3급) 순서로 배워요. 각 단원의 테스트를 80% 이상 맞히면 다음 단원이 열려요.
        </p>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={unlockAll} onChange={(e) => setUnlockAll(e.target.checked)} className="size-4 accent-red-600" />
          모든 단원 열기 (이미 배운 사람용)
        </label>
      </header>

      {STAGES.map(({ stage, label, sub }) => {
        const items = COURSE.filter((c) => c.stage === stage)
        if (items.length === 0) return null
        const done = items.filter((c) => state.passed(c.id)).length
        return (
          <section key={stage} className="space-y-2">
            <div className="flex items-baseline justify-between">
              <h2 className="font-bold text-slate-700">
                {label} <span className="text-sm font-medium text-slate-400">· {sub}</span>
              </h2>
              <span className="text-xs tabular-nums text-slate-500">
                {done} / {items.length}
              </span>
            </div>
            <ul className="space-y-1.5">
              {items.map((item) => {
                const isCurrent = item === state.current
                const passed = state.passed(item.id)
                const locked = !state.unlocked(item)
                const best = state.progress.get(item.id)?.best
                return (
                  <li key={item.id} ref={isCurrent ? currentRef : undefined}>
                    <button
                      type="button"
                      onClick={() => open(item)}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition active:scale-[0.99] ${
                        isCurrent ? 'border-red-300 bg-red-50 shadow-sm' : passed ? 'border-emerald-200 bg-white' : 'border-slate-200 bg-white'
                      } ${locked ? 'opacity-50' : ''}`}
                    >
                      <span
                        className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          passed ? 'bg-emerald-100 text-emerald-700' : isCurrent ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {passed ? '✓' : locked ? '🔒' : item.kind === 'sound' ? item.id.slice(1) : item.unit.id}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs text-slate-400">{courseLabel(item)}</span>
                        <span className="block truncate font-semibold">{item.title}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {item.kind === 'sound'
                            ? item.lesson.summary
                            : `단어 ${item.unit.words.length} · 한자 ${NEW_CHARS.get(item.unit.id)?.length ?? 0} · ${item.unit.grammar.map((g) => g.title.split(' — ')[0]).join(', ')}`}
                        </span>
                      </span>
                      {best !== undefined && <span className={`shrink-0 text-xs font-semibold tabular-nums ${passed ? 'text-emerald-600' : 'text-amber-600'}`}>{best}%</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}

      {notice && (
        <div className="fixed inset-x-4 bottom-24 z-20 mx-auto max-w-md rounded-xl bg-slate-800 px-4 py-3 text-center text-sm text-white shadow-lg">{notice}</div>
      )}
    </div>
  )
}
