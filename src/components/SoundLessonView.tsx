import type { SoundLesson } from '../data'
import { syllableChar, syllablesOf } from '../lib/pinyin'
import { speak } from '../lib/speech'
import { Pinyin } from './Pinyin'
import { ToneChart } from './ToneChart'
import { Zh } from './Zh'

/** 병음 음절 하나를 그 소리의 대표 한자로 읽어 준다 */
export function SyllableButton({ py }: { py: string }) {
  const s = syllablesOf(py)[0]
  const ch = s ? syllableChar(s.base, s.tone) : null
  return (
    <button
      type="button"
      disabled={!ch}
      onClick={() => ch && speak(ch)}
      className="flex min-w-16 flex-col items-center rounded-xl border border-slate-200 bg-white px-3 py-2 transition hover:border-red-300 active:scale-95 disabled:opacity-40"
    >
      <Pinyin text={py} className="text-xl font-semibold" />
      {ch && <Zh className="text-xs text-slate-400">{ch}</Zh>}
    </button>
  )
}

export function SoundLessonView({ lesson }: { lesson: SoundLesson }) {
  return (
    <div className="space-y-4">
      {lesson.sections.map((sec, i) => (
        <section key={i} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="font-bold text-slate-800">{sec.title}</h2>
          <div className="space-y-2 text-sm leading-relaxed text-slate-600">
            {sec.body.map((p, j) => (
              <p key={j}>{p}</p>
            ))}
          </div>
          {sec.toneChart && <ToneChart />}
          {sec.items && (
            <div className="flex flex-wrap gap-2">
              {sec.items.map((py) => (
                <SyllableButton key={py} py={py} />
              ))}
            </div>
          )}
          {sec.words && (
            <div className="grid gap-2 sm:grid-cols-2">
              {sec.words.map((w) => (
                <button key={w.h} type="button" onClick={() => speak(w.h)} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-left hover:bg-red-50">
                  <span className="text-slate-400">🔊</span>
                  <span>
                    <Zh className="text-xl">{w.h}</Zh>
                    <Pinyin text={w.p} className="ml-2" />
                    <span className="block text-xs text-slate-500">{w.m}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  )
}
