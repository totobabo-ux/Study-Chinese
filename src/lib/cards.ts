import { CHARS, CHAR_MAP, SOUND_LESSONS, UNITS, UNIT_OF_CHAR, sentenceId, sentenceText, sentenceTokens, wordId, type CharInfo, type Sentence, type Word } from '../data'
import { markTone, syllableChar, syllablesOf } from './pinyin'

export interface Face {
  text: string
  sub?: string
  /** 한자 위에 보여줄 병음 (설정에서 켰을 때) */
  pinyin?: string
  /** 중국어면 true (글꼴·크기 처리) */
  zh: boolean
}

export type Kind = 'char' | 'word' | 'sent' | 'tone'

/** 퀴즈에서 쓰는 공통 학습 카드. front = 중국어 쪽, back = 뜻·발음 쪽 */
export interface StudyCard {
  id: string
  kind: Kind
  front: Face
  back: Face
  /** 발음 재생용 텍스트 (한자) */
  speak: string
  /** 성조 기호 병음 */
  pinyin: string
  /** 소리가 같은 카드끼리 보기에 함께 나오지 않게 하는 키 */
  soundKey: string
  /** 오답 보기를 고를 때 우선하는 묶음 (단원 등) */
  group: string
  /** 문장 카드: 어순 배열용 조각 */
  tokens?: string[]
  /** 음절 카드: 소리가 비슷한 음절 (성조 없이) */
  confusable?: string[]
}

/**
 * 출제 방향
 * fb: 중국어 보고 뜻 고르기 / bf: 뜻 보고 중국어 고르기
 * lf: 듣고 한자 고르기 / lb: 듣고 뜻 고르기
 * tn: 듣고 성조 고르기 / ls: 듣고 음절 고르기
 * ar: 어순 배열 / ty: 병음 입력
 */
export type Direction = 'fb' | 'bf' | 'lf' | 'lb' | 'tn' | 'ls' | 'ar' | 'ty'

export const DEFAULT_DIRECTIONS: Record<Kind, Direction[]> = {
  char: ['fb', 'lf'],
  word: ['fb', 'bf', 'lb'],
  sent: ['ar'],
  tone: ['tn'],
}

export function charCard(c: CharInfo): StudyCard {
  return {
    id: `char:${c.c}`,
    kind: 'char',
    front: { text: c.c, pinyin: c.p, zh: true },
    back: { text: c.p, sub: [c.hun, c.m].filter(Boolean).join(' · '), zh: false },
    speak: c.c,
    pinyin: c.p,
    soundKey: c.p,
    group: `u${UNIT_OF_CHAR.get(c.c) ?? 0}`,
  }
}

export function wordCard(w: Word, unit: number): StudyCard {
  return {
    id: wordId(w),
    kind: 'word',
    front: { text: w.h, pinyin: w.p, zh: true },
    back: { text: w.m, zh: false },
    speak: w.h,
    pinyin: w.p,
    soundKey: w.p.toLowerCase().replace(/['\s]/g, ''),
    group: `u${unit}`,
  }
}

export function sentenceCard(s: Sentence, unit: number): StudyCard {
  return {
    id: sentenceId(s),
    kind: 'sent',
    front: { text: sentenceText(s), pinyin: s.p, zh: true },
    back: { text: s.m, zh: false },
    speak: sentenceText(s),
    pinyin: s.p,
    soundKey: sentenceText(s),
    group: `u${unit}`,
    tokens: sentenceTokens(s),
  }
}

/** 발음 단원의 헷갈리는 음절 묶음 (음절 → 같은 묶음의 다른 음절) */
const CONFUSABLE = new Map<string, string[]>()
for (const lesson of SOUND_LESSONS) {
  for (const set of lesson.confusable ?? []) {
    for (const base of set) CONFUSABLE.set(base, [...new Set([...(CONFUSABLE.get(base) ?? []), ...set.filter((b) => b !== base)])])
  }
}

/** 음절 카드. 예: "ma3" → 马 / mǎ */
export function toneCard(numbered: string): StudyCard | null {
  const m = numbered.match(/^([a-zü]+)([1-4])$/)
  if (!m) return null
  const [, base, t] = m
  const tone = Number(t)
  const ch = syllableChar(base, tone)
  if (!ch) return null
  const py = markTone(base, tone)
  return {
    id: `tone:${numbered}`,
    kind: 'tone',
    front: { text: ch, pinyin: py, zh: true },
    back: { text: py, zh: false },
    speak: ch,
    pinyin: py,
    soundKey: numbered,
    group: base,
    confusable: CONFUSABLE.get(base),
  }
}

export const CHAR_CARDS: StudyCard[] = CHARS.filter((c) => UNIT_OF_CHAR.has(c.c)).map(charCard)
export const WORD_CARDS: StudyCard[] = UNITS.flatMap((u) => u.words.map((w) => wordCard(w, u.id)))
export const SENT_CARDS: StudyCard[] = UNITS.flatMap((u) => u.sentences.map((s) => sentenceCard(s, u.id)))

const CARD_BY_ID = new Map([...CHAR_CARDS, ...WORD_CARDS, ...SENT_CARDS].map((c) => [c.id, c]))

export function cardById(id: string): StudyCard | undefined {
  if (id.startsWith('tone:')) return toneCard(id.slice(5)) ?? undefined
  if (id.startsWith('char:') && !CARD_BY_ID.has(id)) {
    const c = CHAR_MAP.get(id.slice(5))
    return c ? charCard(c) : undefined
  }
  return CARD_BY_ID.get(id)
}

export function cardsOfKind(kind: Kind): StudyCard[] {
  return kind === 'char' ? CHAR_CARDS : kind === 'word' ? WORD_CARDS : kind === 'sent' ? SENT_CARDS : []
}

/** 한 단원의 카드 */
export function unitCards(unitId: number) {
  const unit = UNITS.find((u) => u.id === unitId)
  if (!unit) return { chars: [], words: [], sentences: [] }
  const group = `u${unitId}`
  return {
    chars: CHAR_CARDS.filter((c) => c.group === group),
    words: WORD_CARDS.filter((c) => c.group === group),
    sentences: SENT_CARDS.filter((c) => c.group === group),
  }
}

/** 발음 단원의 음절 카드 */
export function soundCards(lessonId: string): StudyCard[] {
  const lesson = SOUND_LESSONS.find((l) => l.id === lessonId)
  return (lesson?.drill ?? []).map(toneCard).filter((c): c is StudyCard => !!c)
}

/**
 * 듣고 성조 고르기가 가능한지
 * 3성 연속(변조)이나 一·不(성조 변화)가 있으면 들리는 소리와 표기가 달라 제외한다
 */
export function toneQuizable(card: StudyCard): boolean {
  if (card.kind === 'tone') return true
  if (card.kind === 'sent') return false
  const syl = syllablesOf(card.pinyin)
  if (syl.length === 0 || syl.length > 4 || syl.length !== [...card.speak].length) return false
  if (/[一不]/.test(card.speak)) return false
  if (!syl.some((s) => s.tone < 5)) return false
  return !syl.some((s, i) => i > 0 && s.tone === 3 && syl[i - 1].tone === 3)
}

/** 성조만 바꾼 병음 보기 (정답 제외) */
export function toneVariants(pinyin: string, count: number): string[] {
  const syl = syllablesOf(pinyin)
  const answer = syl.map((s) => markTone(s.base, s.tone)).join('')
  const toned = syl.map((s, i) => (s.tone < 5 ? i : -1)).filter((i) => i >= 0)
  const out = new Set<string>()
  if (syl.length === 1) {
    for (let t = 1; t <= 4; t++) if (t !== syl[0].tone) out.add(markTone(syl[0].base, t))
  } else {
    for (let tries = 0; tries < 60 && out.size < count; tries++) {
      const tones = syl.map((s) => s.tone)
      // 성조가 있는 음절 1~2개를 다른 성조로
      const changes = Math.random() < 0.6 ? 1 : 2
      for (let k = 0; k < changes; k++) {
        const i = toned[Math.floor(Math.random() * toned.length)]
        let t = tones[i]
        while (t === tones[i]) t = 1 + Math.floor(Math.random() * 4)
        tones[i] = t
      }
      const v = syl.map((s, i) => markTone(s.base, tones[i])).join('')
      if (v !== answer) out.add(v)
    }
  }
  return [...out].slice(0, count)
}
