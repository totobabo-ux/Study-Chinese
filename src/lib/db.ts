import Dexie, { type EntityTable } from 'dexie'
import { Rating, createEmptyCard, fsrs, generatorParameters, type Card } from 'ts-fsrs'

export interface Stat {
  /** 예: "char:学", "word:学生|xuésheng", "sent:我 是 学生。", "tone:ma3" */
  id: string
  correct: number
  wrong: number
  /** 연속 정답 수. 틀리면 0으로 초기화 */
  streak: number
  lastSeen: number
  /** 간격 반복(FSRS) 상태 */
  card?: Card
  /** 다음 복습 시각 (ms). 복습 목록 조회용 인덱스 */
  due?: number
}

export interface DayLog {
  /** YYYY-MM-DD (현지 시각) */
  date: string
  answers: number
  correct: number
}

/** 단원 테스트 기록 */
export interface UnitProgress {
  /** 발음 단원은 "p1"~, 일반 단원은 "1"~ */
  id: string
  /** 최고 점수 (0~100) */
  best: number
  /** 처음 통과한 시각 */
  passedAt?: number
}

export const db = new Dexie('study-chinese') as Dexie & {
  stats: EntityTable<Stat, 'id'>
  days: EntityTable<DayLog, 'date'>
  progress: EntityTable<UnitProgress, 'id'>
}

db.version(1).stores({ stats: 'id, due', days: 'date', progress: 'id' })

const scheduler = fsrs(generatorParameters({ enable_fuzz: true }))

export function dayKey(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export async function recordAnswer(id: string, ok: boolean): Promise<void> {
  const now = new Date()
  await db.transaction('rw', db.stats, db.days, async () => {
    const s = (await db.stats.get(id)) ?? { id, correct: 0, wrong: 0, streak: 0, lastSeen: 0 }
    const { card } = scheduler.next(s.card ?? createEmptyCard(now), now, ok ? Rating.Good : Rating.Again)
    await db.stats.put({
      ...s,
      correct: s.correct + (ok ? 1 : 0),
      wrong: s.wrong + (ok ? 0 : 1),
      streak: ok ? s.streak + 1 : 0,
      lastSeen: now.getTime(),
      card,
      due: card.due.getTime(),
    })

    const date = dayKey(now)
    const d = (await db.days.get(date)) ?? { date, answers: 0, correct: 0 }
    await db.days.put({ ...d, answers: d.answers + 1, correct: d.correct + (ok ? 1 : 0) })
  })
}

/** 단원 테스트 통과 기준 (%) */
export const PASS_SCORE = 80

export async function recordUnitTest(id: string, score: number): Promise<boolean> {
  const passed = score >= PASS_SCORE
  await db.transaction('rw', db.progress, async () => {
    const p = (await db.progress.get(id)) ?? { id, best: 0 }
    await db.progress.put({ ...p, best: Math.max(p.best, score), passedAt: p.passedAt ?? (passed ? Date.now() : undefined) })
  })
  return passed
}

export type Mastery = 'new' | 'weak' | 'learning' | 'mastered'

/** 연속 3번 맞히면 '익힘'으로 판단 */
export function mastery(s: Stat | undefined): Mastery {
  if (!s || s.correct + s.wrong === 0) return 'new'
  if (s.streak >= 3) return 'mastered'
  if (s.streak === 0) return 'weak'
  return 'learning'
}

/** 연속 학습일 수. 오늘 아직 안 했으면 어제까지 이어진 기록을 센다 */
export function studyStreak(days: DayLog[]): number {
  const done = new Set(days.filter((d) => d.answers > 0).map((d) => d.date))
  const cursor = new Date()
  if (!done.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1)
  let n = 0
  while (done.has(dayKey(cursor))) {
    n++
    cursor.setDate(cursor.getDate() - 1)
  }
  return n
}

export async function exportStats(): Promise<string> {
  return JSON.stringify({
    app: 'study-chinese',
    version: 1,
    stats: await db.stats.toArray(),
    days: await db.days.toArray(),
    progress: await db.progress.toArray(),
  })
}

export async function importStats(json: string): Promise<number> {
  const data = JSON.parse(json) as { app?: string; stats?: Stat[]; days?: DayLog[]; progress?: UnitProgress[] }
  if (data.app !== 'study-chinese' || !Array.isArray(data.stats)) throw new Error('올바른 백업 파일이 아니에요')
  // JSON으로 바뀐 날짜 문자열을 Date로 되돌린다
  const stats = data.stats.map((s) =>
    s.card
      ? {
          ...s,
          card: {
            ...s.card,
            due: new Date(s.card.due),
            last_review: s.card.last_review ? new Date(s.card.last_review) : undefined,
          },
        }
      : s,
  )
  await db.transaction('rw', db.stats, db.days, db.progress, async () => {
    await db.stats.clear()
    await db.stats.bulkPut(stats)
    await db.days.clear()
    if (Array.isArray(data.days)) await db.days.bulkPut(data.days)
    await db.progress.clear()
    if (Array.isArray(data.progress)) await db.progress.bulkPut(data.progress)
  })
  return stats.length
}

export async function resetStats(): Promise<void> {
  await db.transaction('rw', db.stats, db.days, db.progress, async () => {
    await db.stats.clear()
    await db.days.clear()
    await db.progress.clear()
  })
}
