// 단원 데이터 점검: 형식, 병음(pinyin-pro와 비교), 문장에 쓰인 미학습 단어
// 사용법: node scripts/check-units.mjs [시작 단원] [끝 단원]
//   PLAN=경로/plan.json 을 주면 단원별 단어 목록이 계획과 같은지도 확인한다
import { readFileSync, readdirSync } from 'node:fs'
import { pinyin } from 'pinyin-pro'

const [from = 1, to = 999] = process.argv.slice(2).map(Number)
const dir = 'src/data/units'
const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort()
const units = files.map((f) => ({ f, u: JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) }))
const plan = process.env.PLAN ? new Map(JSON.parse(readFileSync(process.env.PLAN, 'utf8')).map((p) => [p.id, p])) : null
const knownChars = new Set(JSON.parse(readFileSync('src/data/chars.json', 'utf8')).map((c) => c.c))

const MARK = { ā: 'a1', á: 'a2', ǎ: 'a3', à: 'a4', ē: 'e1', é: 'e2', ě: 'e3', è: 'e4', ī: 'i1', í: 'i2', ǐ: 'i3', ì: 'i4', ō: 'o1', ó: 'o2', ǒ: 'o3', ò: 'o4', ū: 'u1', ú: 'u2', ǔ: 'u3', ù: 'u4', ǖ: 'ü1', ǘ: 'ü2', ǚ: 'ü3', ǜ: 'ü4' }
/** "xuésheng" 같은 붙여 쓴 병음을 pinyin-pro 음절 목록에 맞춰 나눈다: 기본형과 성조 비교 */
function toBaseTone(s) {
  let tone = 0
  let base = ''
  for (const ch of s.toLowerCase()) {
    if (MARK[ch]) {
      base += MARK[ch][0]
      tone = Number(MARK[ch][1])
    } else base += ch
  }
  return { base: base.replace(/v/g, 'ü'), tone }
}

/** 한자 문자열과 병음 문자열을 비교. 반환: 문제 설명 목록 */
function comparePinyin(hanzi, py) {
  const chars = [...hanzi].filter((c) => /\p{Script=Han}/u.test(c))
  const expected = pinyin(chars.join(''), { type: 'array', toneSandhi: false })
  // 병음 쪽: 문장부호·공백·' 제거 후 기대 음절 길이만큼 앞에서부터 잘라 비교
  let rest = toBaseTone(py.replace(/[^a-zA-ZüÜāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙ]/g, '')).base
  const raw = py.replace(/[^a-zA-ZüÜāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜĀÁǍÀĒÉĚÈĪÍǏÌŌÓǑÒŪÚǓÙ]/g, '').toLowerCase()
  let pos = 0
  const problems = []
  for (let i = 0; i < chars.length; i++) {
    const exp = toBaseTone(expected[i])
    let seg = exp.base
    // 儿화: 앞 음절 끝에 r이 붙는다
    if (chars[i] === '儿' && i > 0 && rest[pos] === 'r' && !rest.startsWith('er', pos)) {
      pos += 1
      continue
    }
    if (!rest.startsWith(seg, pos)) {
      // 다른 읽기(多音字)일 수 있다: 다음 음절 경계를 알 수 없으니 여기서 멈춘다
      problems.push(`${chars[i]}: 기대 ${expected[i]} / 실제 ${raw.slice(pos, pos + 8)}…`)
      return problems
    }
    const actual = toBaseTone(raw.slice(pos, pos + seg.length))
    if (actual.tone && exp.tone && actual.tone !== exp.tone) problems.push(`${chars[i]}: 성조 ${expected[i]} ≠ ${raw.slice(pos, pos + seg.length)}`)
    pos += seg.length
  }
  if (pos !== rest.length) problems.push(`병음이 남음: ${raw.slice(pos)}`)
  return problems
}

let errors = 0
let warnings = 0
const err = (u, msg) => {
  errors++
  console.log(`❌ [${u}] ${msg}`)
}
const warn = (u, msg) => {
  warnings++
  console.log(`⚠️  [${u}] ${msg}`)
}

// 배운 단어: 계획이 있으면 계획 기준 (앞 단원 파일이 아직 없어도 되게), 없으면 파일 기준
const taught = new Set()
const taughtUpTo = (id) => {
  if (!plan) return
  for (const [pid, p] of plan) if (pid <= id) p.words.forEach((h) => taught.add(h))
}
const allWordIds = new Map()
for (const { f, u } of units) {
  const inRange = u.id >= from && u.id <= to
  const tag = `${f} ${u.id}과`
  for (const w of u.words ?? []) taught.add(w.h)
  taughtUpTo(u.id)
  if (!inRange) continue

  if (`${String(u.id).padStart(2, '0')}.json` !== f) err(tag, '파일 이름과 id가 다름')
  if (![1, 2, 3].includes(u.stage)) err(tag, 'stage 오류')
  if (!u.title) err(tag, 'title 없음')
  if (!Array.isArray(u.words) || !Array.isArray(u.grammar) || !Array.isArray(u.sentences)) {
    err(tag, 'words/grammar/sentences 배열 없음')
    continue
  }
  if (plan) {
    const want = plan.get(u.id)?.words ?? []
    const got = u.words.map((w) => w.h)
    const missing = want.filter((h) => !got.includes(h))
    const extra = got.filter((h) => !want.includes(h))
    if (missing.length) err(tag, `계획에 있는데 빠진 단어: ${missing.join(' ')}`)
    if (extra.length) warn(tag, `계획에 없는 단어: ${extra.join(' ')}`)
  }
  for (const w of u.words) {
    if (!w.h || !w.p || !w.m) err(tag, `단어 필드 누락: ${JSON.stringify(w)}`)
    if (/\s/.test(w.p) && !/^[A-Z]/.test(w.p)) warn(tag, `단어 병음에 공백: ${w.h} ${w.p}`)
    const id = `${w.h}|${w.p}`
    if (allWordIds.has(id)) err(tag, `중복 단어: ${w.h} (${allWordIds.get(id)}과에도 있음)`)
    allWordIds.set(id, u.id)
    for (const p of comparePinyin(w.h, w.p)) warn(tag, `단어 ${w.h} ${w.p} — ${p}`)
  }
  if (u.grammar.length < 1) err(tag, '문법 없음')
  const sentences = [...u.sentences.map((s) => ['문장', s]), ...u.grammar.flatMap((g) => (g.examples ?? []).map((s) => ['예문', s]))]
  for (const g of u.grammar) {
    if (!g.title || !Array.isArray(g.body) || g.body.length === 0) err(tag, `문법 형식 오류: ${g.title}`)
    if (!Array.isArray(g.examples) || g.examples.length < 2) err(tag, `문법 예문 부족: ${g.title}`)
  }
  if (u.sentences.length < 5) err(tag, `연습 문장 부족 (${u.sentences.length}개)`)
  for (const [kind, s] of sentences) {
    if (!s.zh || !s.p || !s.m) {
      err(tag, `${kind} 필드 누락: ${JSON.stringify(s)}`)
      continue
    }
    if (/  |^ | $/.test(s.zh)) err(tag, `${kind} 공백 오류: "${s.zh}"`)
    if (/ [，。！？、：；]/.test(s.zh)) err(tag, `${kind} 문장부호 앞 공백: "${s.zh}"`)
    if (/[,.!?]/.test(s.zh)) err(tag, `${kind} 반각 문장부호: "${s.zh}"`)
    const tokens = s.zh.split(/[\s，。！？、：；“”…]+/).filter(Boolean)
    if (kind === '문장' && tokens.length < 3) err(tag, `문장 조각이 너무 적음: "${s.zh}"`)
    for (const p of comparePinyin(s.zh, s.p)) warn(tag, `${kind} "${s.zh}" — ${p}`)
    const unknownChars = [...s.zh].filter((c) => /\p{Script=Han}/u.test(c) && !knownChars.has(c))
    if (unknownChars.length) warn(tag, `${kind} HSK 3급 밖 글자 ${unknownChars.join('')}: "${s.zh}"`)
    const unknownTokens = tokens.filter((t) => t.length > 1 && !taught.has(t) && ![...t].every((c) => taught.has(c)))
    if (unknownTokens.length) warn(tag, `${kind} 아직 안 배운 단어 ${unknownTokens.join(' ')}: "${s.zh}"`)
  }
}
console.log(`\n단원 ${units.filter(({ u }) => u.id >= from && u.id <= to).length}개 점검: 오류 ${errors}, 경고 ${warnings}`)
process.exit(errors ? 1 : 0)
