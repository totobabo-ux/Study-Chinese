import { navigate } from '../lib/router'

/** 페이지 상단의 하위 탭 (주소로 이동) */
export function Tabs({ base, current, tabs }: { base: string; current: string; tabs: { id: string; label: string }[] }) {
  return (
    <div className="-mx-4 flex gap-1 overflow-x-auto border-b border-slate-200 px-4">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => navigate(`${base}/${t.id}`)}
          className={`-mb-px shrink-0 border-b-2 px-3.5 py-2.5 text-sm font-semibold transition ${
            current === t.id ? 'border-red-500 text-red-600' : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
