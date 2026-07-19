---
name: tag-pipeline
description: techgom의 태그 시스템 작업 절차 — 태그/카테고리 추가·삭제·이동, 태그 백필(backfill-tags), AI 태그 생성(Fireworks) 튜닝. 사용자가 "○○ 태그 추가해줘", "태그 필터에 △△ 카테고리 넣어줘", "태그 없는 글 채워줘", "태그가 이상하게 달려", Fireworks/ALLOWED_TAGS를 언급하는 경우 반드시 이 스킬을 사용할 것. 태그는 단일 소스 파일이 있어서 다른 곳을 고치면 UI와 AI 생성이 어긋난다.
---

# 태그 파이프라인 (추가/백필/AI 생성)

## 구조: 단일 소스에서 두 갈래로 파생

```
lib/tag-data.js (단일 소스 — 플레인 JS인 이유: node 크롤러가 직접 import)
├─ lib/tag-filters.ts     → UI 태그 필터 (TAG_FILTER_OPTIONS)
└─ scripts/ai-tags.js     → AI 태그 생성 화이트리스트 (ALLOWED_TAGS = ALL_FILTER_TAGS)
```

**태그 추가/삭제는 반드시 `lib/tag-data.js`에서만 한다.** 과거에 ALLOWED_TAGS와 UI 필터가 따로 놀아서 동기화 버그가 있었고(커밋 1899f24), 그 해결책이 이 단일 소스 구조다. `tag-filters.ts`나 `ai-tags.js`에 태그를 직접 하드코딩하지 말 것.

## 태그 추가

1. `lib/tag-data.js`의 `TAG_FILTER_OPTIONS`에서 적절한 카테고리(frontend/backend/ai/devops/architecture/else)에 태그 문자열을 추가한다. 태그는 소문자로 통일한다 (AI 생성 결과가 `toLowerCase()` 정규화됨).
2. 태그 옆 주석의 `// N개`는 작성 당시 글 수 참고치다. 새 태그는 주석 없이 추가해도 된다.
3. 새 **카테고리**를 추가하는 경우에만 `lib/tag-filters.ts`의 `TagCategory` 유니온 타입에 id를 추가한다.
4. `npx tsc --noEmit`으로 타입 체크.
5. 기존 글에 새 태그를 소급 적용하고 싶으면 아래 백필을 실행한다. 단, **백필은 태그가 비어 있는 글만 처리**하므로 이미 태그가 있는 글에는 새 태그가 붙지 않는다 — 전면 재태깅은 지원하지 않는 설계다 (Fireworks 비용 때문).

## 태그 백필 (태그 없는 글 채우기)

`scripts/backfill-tags.js`가 `blogs` 테이블에서 `tags`가 null/빈 배열인 글만 골라 AI로 태그를 생성해 채운다.

```bash
# 1. 반드시 드라이런으로 먼저 확인 (DB 수정 없음, Fireworks 호출은 발생)
TAG_BACKFILL_DRY_RUN=true TAG_BACKFILL_LIMIT=10 pnpm backfill-tags

# 2. 결과가 괜찮으면 실제 실행 (limit을 점진적으로 늘리는 걸 권장)
TAG_BACKFILL_LIMIT=100 pnpm backfill-tags
```

필요한 env (`.env`): `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `FIREWORKS_API_KEY`

제어 env:
| 변수 | 기본값 | 의미 |
|---|---|---|
| `TAG_BACKFILL_DRY_RUN` | false | `true`면 DB에 쓰지 않고 예정 결과만 출력 |
| `TAG_BACKFILL_LIMIT` | 0 (무제한) | 태그 생성 시도 개수 상한 |
| `TAG_REQUEST_DELAY_MS` | 8000 | 요청 간 지연. **Fireworks 레이트리밋이 낮아서 줄이면 429가 난다** |
| `TAG_RETRY_BASE_MS` | 5000 | 429/5xx 재시도 대기 기준 |

## AI 태그 생성 동작 (scripts/ai-tags.js)

- 모델: `FIREWORKS_MODEL` env (기본 `accounts/fireworks/models/deepseek-v3p1-terminus`)
- 프롬프트가 화이트리스트(`ALL_FILTER_TAGS`) 밖 태그를 금지하고, JSON 배열만 응답하도록 강제한다. 응답이 JSON이 아니면 쉼표/줄바꿈 파싱으로 폴백.
- **빈 배열 응답은 "비기술 글" 판정 신호**로도 쓰인다 — 크롤러가 개인 블로그 글의 수집 제외 여부를 이 신호로 결정한다 (`scripts/rss/filter.js`의 `isNonTechClassification`). 프롬프트의 빈 배열 규칙을 수정할 때는 이 부작용을 반드시 고려할 것. 회고/커리어/문화 글은 기술 글로 취급한다는 규칙도 프롬프트에 있다.
- 크롤링 시 최종 태그는 피드 category 기반 기본 태그 + AI 태그를 병합해 최대 8개로 자른다.

## 태그가 이상하게 달릴 때 디버깅 순서

1. 해당 글의 title/summary로 프롬프트가 어떻게 만들어지는지 확인 (`buildPrompt`)
2. 429가 잦으면 지연/재시도 env부터 확인 — 파싱 문제가 아니라 레이트리밋이 원인인 경우가 많았다 (커밋 21e3ffa)
3. 화이트리스트 밖 태그만 반환된 경우 태그가 비게 되는데, 이는 `lib/tag-data.js`에 해당 태그가 없다는 뜻 — 태그 추가를 검토
