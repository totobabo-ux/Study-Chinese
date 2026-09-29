import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './lib/db'
import { navigate, useRoute } from './lib/router'
import { CharPage } from './pages/CharPage'
import { Course } from './pages/Course'
import { Dictionary } from './pages/Dictionary'
import { Home } from './pages/Home'
import { Review } from './pages/Review'
import { SoundPage } from './pages/SoundPage'
import { UnitPage } from './pages/UnitPage'

const NAV: { page: string; label: string; icon: string; zh?: boolean }[] = [
  { page: 'home', label: '홈', icon: '🏠' },
  { page: 'course', label: '학습', icon: '📚' },
  { page: 'sound', label: '발음', icon: '拼', zh: true },
  { page: 'dict', label: '사전', icon: '字', zh: true },
  { page: 'review', label: '복습', icon: '🔁' },
]

/** 하위 화면이 속한 하단 탭 */
const NAV_OF: Record<string, string> = { unit: 'course', char: 'dict' }

export default function App() {
  const [page = 'home', sub, sub2] = useRoute()
  const dueCount = useLiveQuery(() => db.stats.where('due').belowOrEqual(Date.now()).count(), [page]) ?? 0
  const active = NAV_OF[page] ?? page

  return (
    <div className="min-h-dvh pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
      <main className="mx-auto max-w-2xl px-4 pt-[calc(1.25rem+env(safe-area-inset-top))]">
        {page === 'home' && <Home dueCount={dueCount} />}
        {page === 'course' && <Course />}
        {page === 'unit' && <UnitPage key={sub} id={sub} tab={sub2} />}
        {page === 'sound' && <SoundPage tab={sub} />}
        {page === 'dict' && <Dictionary tab={sub} />}
        {page === 'char' && <CharPage key={sub} c={sub} />}
        {page === 'review' && <Review tab={sub} />}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-2xl">
          {NAV.map((n) => (
            <button
              key={n.page}
              type="button"
              onClick={() => navigate(n.page)}
              className={`relative flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${active === n.page ? 'text-red-600' : 'text-slate-400'}`}
            >
              <span lang={n.zh ? 'zh-CN' : undefined} className={`text-xl leading-none ${n.zh ? 'font-zh font-bold' : ''}`}>
                {n.icon}
              </span>
              {n.label}
              {n.page === 'review' && dueCount > 0 && (
                <span className="absolute right-[calc(50%-1.6rem)] top-1 min-w-5 rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-5 text-white">
                  {dueCount > 99 ? '99+' : dueCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
