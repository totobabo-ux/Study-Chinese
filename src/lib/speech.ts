let zhVoice: SpeechSynthesisVoice | null = null
let rate = 0.8
let audio: HTMLAudioElement | null = null

/** 중국 본토 표준어 음성을 고른다 (홍콩·대만 음성은 뒤로) */
function pickVoice(): void {
  if (!('speechSynthesis' in window)) return
  const voices = speechSynthesis.getVoices()
  const zh = voices.filter((v) => /^(zh|cmn)([-_]|$)/i.test(v.lang) || /Chinese|中文|普通话|國語|国语/i.test(v.name))
  const mainland = zh.filter((v) => /CN|Hans/i.test(v.lang) || /Mainland|普通话|中国大陆/i.test(v.name))
  const pool = mainland.length ? mainland : zh
  // 온라인(고품질) 음성이 있으면 우선 사용
  zhVoice = pool.find((v) => !v.localService) ?? pool[0] ?? null
}

if ('speechSynthesis' in window) {
  pickVoice()
  speechSynthesis.addEventListener('voiceschanged', pickVoice)
}

export function isSpeechSupported(): boolean {
  return 'speechSynthesis' in window
}

export function hasChineseVoice(): boolean {
  if (!zhVoice) pickVoice()
  return zhVoice !== null
}

/** 말하기 속도 (설정에서 바꿈) */
export function setSpeechRate(r: number): void {
  rate = r
}

/**
 * 기기에 중국어 음성이 없을 때: 온라인 TTS 음성 파일을 재생한다 (인터넷 필요)
 * 기기 기본 음성(한국어 등)으로 읽으면 한자를 한국 한자음으로 읽어 버리기 때문
 */
function playOnline(text: string, speed: number): void {
  audio?.pause()
  audio = new Audio(`https://translate.google.com/translate_tts?ie=UTF-8&tl=zh-CN&client=tw-ob&q=${encodeURIComponent(text.slice(0, 200))}`)
  // 온라인 음성은 원래 조금 느리므로 보통 속도(0.8)를 1배로 맞춘다
  audio.playbackRate = Math.min(1.5, Math.max(0.5, speed / 0.8))
  audio.play().catch(() => {
    // 오프라인 등으로 재생 실패 시 조용히 무시
  })
}

export function speak(text: string, slow = false): void {
  // 단어 사이 공백은 읽기에 방해가 되므로 없앤다
  const clean = text.replace(/ /g, '')
  const speed = slow ? rate * 0.7 : rate
  if (!hasChineseVoice()) {
    if ('speechSynthesis' in window) speechSynthesis.cancel()
    playOnline(clean, speed)
    return
  }
  audio?.pause()
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(clean)
  u.lang = 'zh-CN'
  u.voice = zhVoice
  u.rate = speed
  speechSynthesis.speak(u)
}
