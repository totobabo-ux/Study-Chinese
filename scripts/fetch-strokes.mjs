// hanzi-writer-data(Make Me a Hanzi 기반, Arphic Public License)에서 필순 데이터를 받아 public/strokes/에 저장
// 사용법: node scripts/fetch-strokes.mjs  (이미 받은 글자는 건너뜀)
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'

const chars = JSON.parse(readFileSync('src/data/chars.json', 'utf8')).map((x) => x.c)
mkdirSync('public/strokes', { recursive: true })

let fetched = 0
const failed = []
const queue = chars.filter((c) => !existsSync(`public/strokes/${c}.json`))
async function worker() {
  for (let c = queue.shift(); c; c = queue.shift()) {
    try {
      const res = await fetch(`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/${encodeURIComponent(c)}.json`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      // 획 모양(strokes)과 중심선(medians)만 필요
      writeFileSync(`public/strokes/${c}.json`, JSON.stringify({ strokes: data.strokes, medians: data.medians }))
      fetched++
    } catch (e) {
      failed.push(`${c} (${e.message})`)
    }
  }
}
await Promise.all(Array.from({ length: 8 }, worker))
console.log(`${fetched}자 저장, 전체 ${chars.length}자`)
if (failed.length) console.log('실패:', failed.join(', '))
