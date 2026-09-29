import { DEFAULT_DIRECTIONS, cardsOfKind, toneQuizable, toneVariants, type Direction, type Face, type Kind, type StudyCard } from './cards'
import { mastery, type Mastery, type Stat } from './db'
import { markTone, syllableChar, syllablesOf } from './pinyin'

export interface Choice {
  key: string
  face: Face
  correct: boolean
}

export interface Question {
  card: StudyCard
  direction: Direction
  /** 객관식 보기 (어순 배열·병음 입력은 빈 배열) */
  choices: Choice[]
}

export interface SessionConfig {
  cards: StudyCard[]
  /** 카드 종류별 출제 방향. 여러 개면 문제마다 무작위 */
  directions?: Partial<Record<Kind, Direction[]>>
  /** practice: 정해진 수만큼 가중치 출제 / review: 목록을 한 번씩 (틀리면 한 번 더) */
  mode: { type: 'practice'; count: number } | { type: 'review' }
  /** 끝났을 때 점수(0~100)를 받는다 (단원 테스트 기록용) */
  onFinish?: (score: number) => void
  /** 결과 화면 제목 */
  title?: string
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const pickOne = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

/** 보기에 표시되는 면 */
export function choiceFace(card: StudyCard, direction: Direction): Face {
  return direction === 'fb' || direction === 'lb' ? card.back : card.front
}

/** 이 카드로 낼 수 있는 방향인지 */
function canAsk(card: StudyCard, d: Direction): boolean {
  switch (d) {
    case 'tn':
      return toneQuizable(card)
    case 'ls':
      return card.kind === 'tone' && !!card.confusable?.length
    case 'ar':
      return card.kind === 'sent' && (card.tokens?.length ?? 0) >= 2
    case 'ty':
      return card.kind !== 'sent' && syllablesOf(card.pinyin).length > 0
    default:
      return card.kind !== 'tone'
  }
}

function cardChoices(answer: StudyCard, pool: StudyCard[], direction: Direction): Choice[] {
  const usedSound = new Set([answer.soundKey])
  const usedText = new Set([answer.front.text, answer.back.text])
  const chosen = [answer]
  const sameKind = cardsOfKind(answer.kind)
  // 같은 묶음(선택 범위 안) → 선택 범위 → 같은 종류 전체 순서로 채운다
  const sources = [shuffle(pool.filter((c) => c.group === answer.group)), shuffle(pool), shuffle(sameKind.filter((c) => c.group === answer.group)), shuffle(sameKind)]
  for (const source of sources) {
    for (const c of source) {
      if (chosen.length >= 4) break
      if (c.kind !== answer.kind || usedSound.has(c.soundKey) || usedText.has(c.front.text) || usedText.has(c.back.text)) continue
      usedSound.add(c.soundKey)
      usedText.add(c.front.text).add(c.back.text)
      chosen.push(c)
    }
  }
  return shuffle(chosen.map((c) => ({ key: c.id, face: choiceFace(c, direction), correct: c === answer })))
}

function pinyinChoice(py: string, correct: boolean): Choice {
  return { key: py, face: { text: py, zh: false }, correct }
}

function makeChoices(card: StudyCard, pool: StudyCard[], direction: Direction): Choice[] {
  if (direction === 'ar' || direction === 'ty') return []
  const answer = syllablesOf(card.pinyin)
    .map((s) => markTone(s.base, s.tone))
    .join('')
  if (direction === 'tn') {
    return shuffle([pinyinChoice(answer, true), ...toneVariants(card.pinyin, 3).map((v) => pinyinChoice(v, false))])
  }
  if (direction === 'ls') {
    const tone = syllablesOf(card.pinyin)[0]?.tone ?? 1
    // 같은 성조로 소리가 비슷한 음절 (그 소리를 가진 한자가 있는 것만)
    const others = shuffle(card.confusable ?? [])
      .filter((b) => syllableChar(b, tone))
      .slice(0, 3)
      .map((b) => pinyinChoice(markTone(b, tone), false))
    return shuffle([pinyinChoice(answer, true), ...others])
  }
  return cardChoices(card, pool, direction)
}

const INITIAL_WEIGHT: Record<Mastery, number> = { new: 3, weak: 4, learning: 2, mastered: 1 }

export class Session {
  private weights = new Map<string, number>()
  private queue: StudyCard[] = []
  private requeued = new Set<string>()
  private last?: StudyCard
  answered = 0
  score = 0
  wrong: StudyCard[] = []

  constructor(
    readonly config: SessionConfig,
    stats: Map<string, Stat>,
  ) {
    for (const c of config.cards) this.weights.set(c.id, INITIAL_WEIGHT[mastery(stats.get(c.id))])
    if (config.mode.type === 'review') this.queue = shuffle(config.cards)
  }

  get total(): number {
    return this.config.mode.type === 'practice' ? this.config.mode.count : this.answered + this.queue.length
  }

  next(): Question | null {
    let card: StudyCard | undefined
    if (this.config.mode.type === 'review') {
      card = this.queue.shift()
    } else if (this.answered < this.config.mode.count) {
      card = this.pickWeighted()
    }
    if (!card) return null
    this.last = card
    const wanted = this.config.directions?.[card.kind] ?? DEFAULT_DIRECTIONS[card.kind]
    const possible = wanted.filter((d) => canAsk(card, d))
    const fallback = DEFAULT_DIRECTIONS[card.kind].filter((d) => canAsk(card, d))
    const direction = pickOne<Direction>(possible.length ? possible : fallback.length ? fallback : ['fb'])
    return { card, direction, choices: makeChoices(card, this.config.cards, direction) }
  }

  answer(card: StudyCard, ok: boolean): void {
    this.answered++
    const w = this.weights.get(card.id) ?? 1
    this.weights.set(card.id, ok ? Math.max(0.5, w / 2) : 4)
    if (ok) {
      this.score++
    } else {
      if (!this.wrong.includes(card)) this.wrong.push(card)
      // 복습에서 틀린 카드는 마지막에 한 번 더
      if (this.config.mode.type === 'review' && !this.requeued.has(card.id)) {
        this.requeued.add(card.id)
        this.queue.push(card)
      }
    }
  }

  private pickWeighted(): StudyCard {
    const pool = this.config.cards
    const candidates = pool.length > 1 && this.last ? pool.filter((c) => c !== this.last) : pool
    const total = candidates.reduce((sum, c) => sum + (this.weights.get(c.id) ?? 1), 0)
    let r = Math.random() * total
    for (const c of candidates) {
      r -= this.weights.get(c.id) ?? 1
      if (r <= 0) return c
    }
    return candidates[candidates.length - 1]
  }
}
