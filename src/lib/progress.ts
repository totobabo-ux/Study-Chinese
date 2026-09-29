import { useLiveQuery } from 'dexie-react-hooks'
import { COURSE, type CourseItem } from '../data'
import { useMemo } from 'react'
import { db, type Stat, type UnitProgress } from './db'
import { useUnlockAll } from './storage'

export interface CourseState {
  loaded: boolean
  progress: Map<string, UnitProgress>
  passed: (id: string) => boolean
  /** 앞 단원 테스트를 통과했거나 "모든 단원 열기"면 열림 */
  unlocked: (item: CourseItem) => boolean
  /** 아직 통과하지 않은 첫 단원 (모두 통과했으면 마지막 단원) */
  current: CourseItem
  passedCount: number
}

export function useCourseState(): CourseState {
  const rows = useLiveQuery(() => db.progress.toArray(), [])
  const [unlockAll] = useUnlockAll()
  const progress = new Map(rows?.map((p) => [p.id, p]))
  const passed = (id: string) => !!progress.get(id)?.passedAt
  const index = new Map(COURSE.map((c, i) => [c.id, i]))
  const unlocked = (item: CourseItem) => {
    const i = index.get(item.id) ?? 0
    return unlockAll || i === 0 || passed(COURSE[i - 1].id)
  }
  const current = COURSE.find((c) => !passed(c.id)) ?? COURSE[COURSE.length - 1]
  return { loaded: !!rows, progress, passed, unlocked, current, passedCount: COURSE.filter((c) => passed(c.id)).length }
}

/** 모든 문제 기록 (id → 기록) */
export function useStatMap(): Map<string, Stat> | undefined {
  const stats = useLiveQuery(() => db.stats.toArray(), [])
  return useMemo(() => (stats ? new Map(stats.map((s) => [s.id, s])) : undefined), [stats])
}
