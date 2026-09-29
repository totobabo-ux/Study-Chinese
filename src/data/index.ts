import CHARS_JSON from './chars.json'
import { SOUND_LESSONS, type SoundLesson } from './sound'
import type { CharInfo, Sentence, Unit, Word } from './types'

export * from './types'
export { SOUND_LESSONS, type SoundLesson } from './sound'

/** 단원 데이터: src/data/units/01.json … (파일 이름 순) */
const unitModules = import.meta.glob<{ default: Unit }>('./units/*.json', { eager: true })
export const UNITS: Unit[] = Object.keys(unitModules)
  .sort()
  .map((k) => unitModules[k].default)

export const STAGES = [
  { stage: 0, label: '발음', sub: '병음과 성조' },
  { stage: 1, label: '1단계', sub: 'HSK 1급' },
  { stage: 2, label: '2단계', sub: 'HSK 2급' },
  { stage: 3, label: '3단계', sub: 'HSK 3급' },
] as const

/** 학습 순서대로 나열한 전체 과정 */
export type CourseItem = { kind: 'sound'; id: string; stage: 0; title: string; lesson: SoundLesson } | { kind: 'unit'; id: string; stage: 1 | 2 | 3; title: string; unit: Unit }

export const COURSE: CourseItem[] = [
  ...SOUND_LESSONS.map((lesson) => ({ kind: 'sound' as const, id: lesson.id, stage: 0 as const, title: lesson.title, lesson })),
  ...UNITS.map((unit) => ({ kind: 'unit' as const, id: String(unit.id), stage: unit.stage, title: unit.title, unit })),
]
export const COURSE_BY_ID = new Map(COURSE.map((c) => [c.id, c]))

/** 과정 안에서의 순번 표시 (발음 1, 단원 12 …) */
export function courseLabel(item: CourseItem): string {
  return item.kind === 'sound' ? `발음 ${item.id.slice(1)}` : `${item.unit.id}과`
}

export const CHARS: CharInfo[] = CHARS_JSON as CharInfo[]
export const CHAR_MAP = new Map(CHARS.map((c) => [c.c, c]))

export function wordId(w: Word): string {
  return `word:${w.h}|${w.p}`
}

export function sentenceId(s: Sentence): string {
  return `sent:${s.zh}`
}

/** 단원별 새 한자: 그 단원의 단어에 처음 나오는 글자 (등장 순) */
export const NEW_CHARS = new Map<number, CharInfo[]>()
/** 글자 → 처음 나오는 단원 */
export const UNIT_OF_CHAR = new Map<string, number>()
/** 단어 id → 단원 */
export const UNIT_OF_WORD = new Map<string, number>()

for (const unit of UNITS) {
  const list: CharInfo[] = []
  for (const w of unit.words) {
    UNIT_OF_WORD.set(wordId(w), unit.id)
    for (const ch of w.h) {
      const info = CHAR_MAP.get(ch)
      if (info && !UNIT_OF_CHAR.has(ch)) {
        UNIT_OF_CHAR.set(ch, unit.id)
        list.push(info)
      }
    }
  }
  NEW_CHARS.set(unit.id, list)
}

export const ALL_WORDS: { word: Word; unit: number }[] = UNITS.flatMap((u) => u.words.map((word) => ({ word, unit: u.id })))

/** 글자가 들어간 단어 */
export function wordsWithChar(ch: string): { word: Word; unit: number }[] {
  return ALL_WORDS.filter((x) => x.word.h.includes(ch))
}

/** 문장을 단어 조각으로 (공백과 문장부호에서 나눈다) */
export function sentenceTokens(s: Sentence): string[] {
  return s.zh.split(/[\s，。！？、：；“”"'…,.!?]+/).filter(Boolean)
}

/** 화면에 보여줄 문장 (공백 없이) */
export function sentenceText(s: Sentence): string {
  return s.zh.replace(/ /g, '')
}

/** 과정에서 배우는 순서대로 나열한 한자 */
export const CHARS_IN_ORDER: CharInfo[] = [...NEW_CHARS.values()].flat()
