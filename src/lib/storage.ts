import { useEffect, useState } from 'react'
import { setSpeechRate } from './speech'

/** 설정 값을 localStorage에 보관. 같은 키를 쓰는 다른 화면과도 바로 동기화된다 */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => read(key, initial))
  useEffect(() => {
    const onChange = (e: Event) => {
      if ((e as CustomEvent<string>).detail === key) setValue(read(key, initial))
    }
    window.addEventListener('setting-change', onChange)
    return () => window.removeEventListener('setting-change', onChange)
    // initial은 처음 값으로만 쓰므로 key가 바뀔 때만 다시 등록한다
  }, [key])
  const set = (v: T) => {
    setValue(v)
    try {
      localStorage.setItem(key, JSON.stringify(v))
    } catch {
      // 저장소를 쓸 수 없는 환경(사생활 보호 모드 등)이면 무시
    }
    window.dispatchEvent(new CustomEvent('setting-change', { detail: key }))
  }
  return [value, set] as const
}

function read<T>(key: string, initial: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? initial : (JSON.parse(raw) as T)
  } catch {
    return initial
  }
}

/** 한자 위에 병음을 보여줄지 (전역 설정) */
export function useShowPinyin() {
  return usePersistentState('show.pinyin', true)
}

/** 병음을 성조별 색으로 칠할지 */
export function useToneColors() {
  return usePersistentState('show.toneColors', true)
}

/** 순서와 관계없이 모든 단원 열기 */
export function useUnlockAll() {
  return usePersistentState('units.unlockAll', false)
}

export const SPEECH_RATES = { slow: 0.6, normal: 0.8, fast: 1 } as const
export type SpeechRate = keyof typeof SPEECH_RATES

export function useSpeechRate() {
  const [value, set] = usePersistentState<SpeechRate>('speech.rate', 'normal')
  setSpeechRate(SPEECH_RATES[value] ?? SPEECH_RATES.normal)
  return [value, set] as const
}

/** 앱 시작 시 저장된 말하기 속도 적용 */
setSpeechRate(SPEECH_RATES[read<SpeechRate>('speech.rate', 'normal')] ?? SPEECH_RATES.normal)
