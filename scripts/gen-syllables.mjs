// 병음표용 음절 데이터 생성: 음절별로 1~4성을 대표하는 한자를 하나씩 고른다 (TTS는 한자를 읽어야 해서)
// 후보: GB2312 1급 상용자 3755자 중 읽는 법이 하나뿐인 글자. 앱에서 배우는 글자를 우선한다
// 사용법: node scripts/gen-syllables.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { pinyin, polyphonic } from 'pinyin-pro'

const learned = new Set(JSON.parse(readFileSync('src/data/chars.json', 'utf8')).map((x) => x.c))
const dec = new TextDecoder('gb2312')
const common = []
for (let hi = 0xb0; hi <= 0xd7; hi++) {
  for (let lo = 0xa1; lo <= 0xfe; lo++) {
    if (hi === 0xd7 && lo > 0xf9) break
    common.push(dec.decode(new Uint8Array([hi, lo])))
  }
}

// 읽는 법이 하나뿐인 글자 → 없으면 여러 음 중 기본 음이 맞는 글자
const table = {}
const fallback = {}
for (const c of common) {
  const readings = polyphonic(c, { toneType: 'num', type: 'array' })[0] ?? []
  const single = readings.length === 1
  const m = (single ? readings[0] : pinyin(c, { toneType: 'num' })).match(/^([a-zü]+)([1-4])$/)
  if (!m) continue
  const [, syl, tone] = m
  const t = single ? table : fallback
  t[syl] ??= [[], [], [], []]
  t[syl][Number(tone) - 1].push(c)
}
for (const syl of Object.keys(fallback)) {
  table[syl] ??= [[], [], [], []]
  table[syl].forEach((cands, i) => {
    if (cands.length === 0) cands.push(...fallback[syl][i])
  })
}
const out = {}
for (const syl of Object.keys(table).sort()) {
  out[syl] = table[syl].map((cands) => cands.find((c) => learned.has(c)) ?? cands[0] ?? null)
}
writeFileSync('src/data/syllables.json', JSON.stringify(out))
console.log(Object.keys(out).length, '음절')
console.log(['ma', 'shi', 'lü', 'nü', 'zhi', 'er'].map((s) => `${s}: ${out[s]?.map((c) => c ?? '·').join('')}`).join('\n'))
console.log(pinyin('一'), pinyin('不'))
