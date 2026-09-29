# 中文 공부

중국어를 처음 배우는 사람을 위한 단원식 학습 웹앱(PWA)입니다. 병음·성조부터 HSK 3.0 1~3급 단어 2,210개까지 90개 단원으로 차근차근 배웁니다. PC와 모바일 브라우저에서 모두 쓸 수 있고, 홈 화면에 설치하면 앱처럼 실행되며 오프라인에서도 동작합니다.

## 구성

- **학습 (단원식)**: 발음 6단원 → 1단계(HSK 1급, 22과) → 2단계(2급, 28과) → 3단계(3급, 34과). 단원 테스트를 80% 이상 맞히면 다음 단원이 열림 (설정에서 모든 단원 열기 가능)
  - 발음 단원: 설명 + 음절 듣기, 성조 듣고 고르기, 비슷한 소리 구분하기
  - 일반 단원: 새 한자 → 단어 → 문법(1~2개) → 문장(어순 배열) → 테스트
- **발음**: 전체 병음표(음절을 누르면 1~4성 재생), 성조 그래프와 두 음절 성조 조합 예시, 발음 레슨 모아 보기
- **사전**: 전체 단어 검색(한자·병음·뜻), 한자 899자 목록. 한자마다 필순 애니메이션, 따라 쓰기(획 순서 채점), 한국 한자 훈음(学 = 배울 학), 번체자, 쓰이는 단어
- **복습·연습**: FSRS 간격 반복 복습, 단원 범위를 골라 푸는 자유 연습
- **퀴즈 유형**: 한자 보고 발음·뜻 고르기 / 뜻 보고 중국어 고르기 / 듣고 한자·뜻 고르기 / 듣고 성조 고르기 / 비슷한 소리 구분 / 병음 입력(ni3hao3) / 문장 어순 배열
- **그 밖에**: 병음 성조 색(1성 빨강·2성 초록·3성 파랑·4성 보라), 병음 보이기/숨기기, 말하기 속도, 연속 학습일·하루 목표, 학습 기록 백업

## 개발

```bash
npm install
npm run dev        # 개발 서버 (같은 Wi-Fi의 폰에서도 접속 가능)
npm run build      # 프로덕션 빌드 → dist/
npm run preview    # 빌드 결과 확인
```

기술 스택: React, TypeScript, Vite, Tailwind CSS, Dexie(IndexedDB), ts-fsrs, hanzi-writer, vite-plugin-pwa, Web Speech API

## 데이터

- `src/data/units/NN.json`: 단원별 단어·문법·문장. 형식은 `src/data/types.ts`
- `src/data/chars.json`: 한자 사전 (대표 병음, 한국 한자 훈음, 뜻, 번체자)
- `src/data/sound.ts`: 발음 단원 내용
- `src/data/syllables.json`: 병음표 음절별 대표 한자 (TTS 재생용). `node scripts/gen-syllables.mjs`로 다시 만듦
- `public/strokes/`: 필순 데이터 (hanzi-writer-data, Make Me a Hanzi 기반, Arphic Public License). `node scripts/fetch-strokes.mjs`로 다시 받음
- 단어 목록: HSK 3.0 1~3급 ([complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary)), 병음은 CC-CEDICT 기준
- 번체자·한자음 확인: Unicode Unihan

단원 데이터를 고친 뒤에는 점검 스크립트를 돌려 주세요. 형식 오류, 단원 간 중복, 병음(pinyin-pro와 비교), 아직 안 배운 단어가 쓰인 문장을 알려 줍니다. pinyin-pro는 다음자(谁 shéi, 教 jiāo 등)를 틀리게 읽을 때가 있어 병음 경고는 확인 후 무시해도 됩니다.

```bash
PLAN=scripts/plan.json node scripts/check-units.mjs        # 전체
PLAN=scripts/plan.json node scripts/check-units.mjs 12 22  # 12~22과만
```
