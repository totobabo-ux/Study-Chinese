let zhVoice: SpeechSynthesisVoice | null = null
let rate = 0.8

function pickVoice(): void {
  if (!('speechSynthesis' in window)) return
  const voices = speechSynthesis.getVoices().filter((v) => /^(zh|cmn)[-_](CN|Hans)/i.test(v.lang) || v.lang === 'zh')
  // 온라인(고품질) 음성이 있으면 우선 사용
  zhVoice = voices.find((v) => !v.localService) ?? voices[0] ?? null
}

if ('speechSynthesis' in window) {
  pickVoice()
  speechSynthesis.addEventListener('voiceschanged', pickVoice)
}

export function isSpeechSupported(): boolean {
  return 'speechSynthesis' in window
}

export function hasChineseVoice(): boolean {
  return zhVoice !== null
}

/** 말하기 속도 (설정에서 바꿈) */
export function setSpeechRate(r: number): void {
  rate = r
}

export function speak(text: string, slow = false): void {
  if (!('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  // 단어 사이 공백은 읽기에 방해가 되므로 없앤다
  const u = new SpeechSynthesisUtterance(text.replace(/ /g, ''))
  u.lang = 'zh-CN'
  if (zhVoice) u.voice = zhVoice
  u.rate = slow ? rate * 0.7 : rate
  speechSynthesis.speak(u)
}
