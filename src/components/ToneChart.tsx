/** 성조 높낮이 그림 (5단계 음높이, 가로축은 시간) */
const TONES = [
  { tone: 1, label: '1성 ˉ', path: 'M 10 10 L 90 10', desc: '높고 평평' },
  { tone: 2, label: '2성 ˊ', path: 'M 10 50 L 90 10', desc: '아래→위' },
  { tone: 3, label: '3성 ˇ', path: 'M 10 70 Q 40 100 55 88 T 90 30', desc: '내렸다 올리기' },
  { tone: 4, label: '4성 ˋ', path: 'M 10 10 L 90 90', desc: '위→아래' },
]

export function ToneChart() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {TONES.map((t) => (
        <div key={t.tone} className="rounded-xl border border-slate-200 bg-white p-2 text-center">
          <svg viewBox="0 0 100 100" className="w-full" aria-hidden>
            {[10, 30, 50, 70, 90].map((y) => (
              <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="#f1f5f9" strokeWidth={1} />
            ))}
            <path d={t.path} fill="none" strokeWidth={7} strokeLinecap="round" className={`tone-${t.tone}`} stroke="currentColor" />
          </svg>
          <div className={`text-sm font-bold tone-${t.tone}`}>{t.label}</div>
          <div className="text-[11px] text-slate-500">{t.desc}</div>
        </div>
      ))}
    </div>
  )
}
