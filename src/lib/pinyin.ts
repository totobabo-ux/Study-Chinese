import SYLLABLE_CHARS from '../data/syllables.json'

/** 성조 기호가 붙은 모음 → [기본 모음, 성조] */
const MARKED: Record<string, [string, number]> = {}
const TONE_MARKS: Record<string, string> = {
  a: 'āáǎà',
  e: 'ēéěè',
  i: 'īíǐì',
  o: 'ōóǒò',
  u: 'ūúǔù',
  ü: 'ǖǘǚǜ',
}
for (const [v, marks] of Object.entries(TONE_MARKS)) {
  ;[...marks].forEach((m, i) => {
    MARKED[m] = [v, i + 1]
    MARKED[m.toUpperCase()] = [v.toUpperCase(), i + 1]
  })
}

/** 표준 음절 + 사전에 가끔 나오는 음절 */
const SYLLABLES = new Set([...Object.keys(SYLLABLE_CHARS), 'shei', 'dei', 'nei', 'zhei', 'den', 'lo', 'yo', 'm', 'n', 'ng', 'hm', 'r'])
const MAX_LEN = 6

export interface Syllable {
  /** 원래 표기 (대소문자·성조 기호 유지) */
  text: string
  /** 성조 없는 소문자. ü는 그대로 */
  base: string
  /** 1~4, 경성은 5 */
  tone: number
}

/** 음절 하나의 성조 기호를 뗀다 */
export function parseSyllable(text: string): Syllable {
  let tone = 5
  let base = ''
  for (const ch of text) {
    const m = MARKED[ch]
    if (m) {
      tone = m[1]
      base += m[0]
    } else {
      base += ch
    }
  }
  return { text, base: base.toLowerCase().replace(/v/g, 'ü'), tone }
}

/** 기본 음절 + 성조 → 성조 기호 표기 (예: "hao", 3 → "hǎo") */
export function markTone(base: string, tone: number): string {
  if (tone < 1 || tone > 4) return base
  const lower = base.toLowerCase()
  let idx = lower.search(/[ae]/)
  if (idx < 0) idx = lower.indexOf('ou')
  if (idx < 0) {
    // 마지막 모음 (iu → u, ui → i)
    for (let i = lower.length - 1; i >= 0; i--) {
      if ('iouü'.includes(lower[i])) {
        idx = i
        break
      }
    }
  }
  if (idx < 0) return base
  const v = lower[idx]
  const marked = TONE_MARKS[v][tone - 1]
  const out = base[idx] === base[idx].toUpperCase() && base[idx] !== v ? marked.toUpperCase() : marked
  return base.slice(0, idx) + out + base.slice(idx + 1)
}

/**
 * 병음 문자열을 음절로 나눈다. 글자(한글·기호)나 공백은 음절이 아닌 조각으로 돌려준다
 * 예: "Nǐ hǎo!" → [Nǐ][ ][hǎo][!]
 */
export function splitPinyin(text: string): (Syllable | string)[] {
  const out: (Syllable | string)[] = []
  const re = /[a-zA-ZüÜvāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙ]+|[^a-zA-ZüÜvāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙ]+/g
  for (const [chunk] of text.matchAll(re)) {
    if (!/[a-zA-Züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/i.test(chunk[0]) && !MARKED[chunk[0]]) {
      out.push(chunk)
      continue
    }
    const parts = segment(chunk)
    if (parts) out.push(...parts.map(parseSyllable))
    else out.push(chunk)
  }
  return out
}

/** 한 덩어리의 로마자를 음절로 나눈다 (가장 긴 음절부터, 막히면 되돌아가기) */
function segment(chunk: string): string[] | null {
  const plain = parseSyllable(chunk).base
  if (plain.length !== chunk.length) return null
  const memo = new Map<number, string[] | null>()
  const go = (i: number): string[] | null => {
    if (i === chunk.length) return []
    if (memo.has(i)) return memo.get(i)!
    let result: string[] | null = null
    for (let len = Math.min(MAX_LEN, chunk.length - i); len >= 1; len--) {
      const cand = plain.slice(i, i + len)
      if (!SYLLABLES.has(cand)) continue
      // 음절은 모음으로 시작하는 다음 음절과 붙지 않는다 (xian ≠ xi'an 구분은 표기상 ' 로 한다)
      const rest = go(i + len)
      if (rest) {
        result = [chunk.slice(i, i + len), ...rest]
        break
      }
    }
    memo.set(i, result)
    return result
  }
  return go(0)
}

/** 병음의 음절 목록 (문장부호·공백 제외) */
export function syllablesOf(text: string): Syllable[] {
  return splitPinyin(text).filter((s): s is Syllable => typeof s !== 'string')
}

/** 비교용 정규형: 소문자, 음절마다 성조 숫자 (경성은 숫자 없음) */
export function toNumbered(text: string): string {
  return syllablesOf(text)
    .map((s) => s.base + (s.tone < 5 ? s.tone : ''))
    .join('')
}

/**
 * 사용자가 입력한 병음 → 정규형. "xue2sheng", "xué sheng", "xue2 sheng5", "nv3" 모두 허용
 */
export function normalizeInput(input: string): string {
  const s = input.trim().toLowerCase().replace(/v/g, 'ü').replace(/u:/g, 'ü').replace(/[\s'’·,.!?，。！？]/g, '')
  // 숫자 표기는 그대로 음절 뒤 숫자, 5와 0은 경성
  if (/\d/.test(s)) return s.replace(/[50]/g, '')
  return toNumbered(s)
}

/** 성조 없이 비교 */
export function stripTones(numbered: string): string {
  return numbered.replace(/\d/g, '')
}

/** 한 음절의 대표 한자 (음성 재생용). 없으면 null */
export function syllableChar(base: string, tone: number): string | null {
  return (SYLLABLE_CHARS as Record<string, (string | null)[]>)[base]?.[tone - 1] ?? null
}

export const TONE_NAMES = ['', '1성', '2성', '3성', '4성', '경성']
