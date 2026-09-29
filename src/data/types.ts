export interface Word {
  /** 간체자 표기 */
  h: string
  /** 병음 (성조 기호, 단어는 붙여 씀. 예: xuésheng, Zhōngguó, nǚ'ér) */
  p: string
  /** 한국어 뜻 (간결하게, 여러 뜻은 ", "로 구분) */
  m: string
  /** 쓰임새 등 짧은 설명 */
  note?: string
}

export interface Sentence {
  /** 단어 사이를 공백 하나로 구분. 문장부호는 앞 단어에 붙인다. 예: "我 是 学生。" */
  zh: string
  /** 병음 문장. 예: "Wǒ shì xuésheng." */
  p: string
  /** 한국어 해석 */
  m: string
}

export interface GrammarPoint {
  /** 예: "A 是 B — A는 B이다" */
  title: string
  /** 설명 문단 */
  body: string[]
  examples: Sentence[]
}

export interface Unit {
  id: number
  /** 1단계 = HSK 1급, 2단계 = 2급, 3단계 = 3급 */
  stage: 1 | 2 | 3
  title: string
  words: Word[]
  grammar: GrammarPoint[]
  /** 문장 연습(어순 배열)용 */
  sentences: Sentence[]
}

export interface CharInfo {
  c: string
  /** 대표 병음 */
  p: string
  /** 한국 한자 훈음 (예: "배울 학"). 한국에서 안 쓰는 글자는 빈 문자열 */
  hun: string
  /** 중국어에서의 뜻 */
  m: string
  /** 번체자 (간체자와 다를 때만) */
  t?: string
}
