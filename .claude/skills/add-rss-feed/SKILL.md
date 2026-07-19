---
name: add-rss-feed
description: techgom에 새 기술 블로그 RSS 피드를 추가하거나, 기존 피드의 URL 변경/오류 수정/비활성화를 처리하는 절차. 사용자가 "○○ 블로그 추가해줘", "○○ 피드가 안 나와/깨졌어", "이 블로그 빼줘", RSS URL을 던져주는 경우 등 피드 목록을 건드리는 모든 작업에 반드시 이 스킬을 사용할 것. 피드 등록은 feeds.js 한 곳이 아니라 로고 매핑·검증까지 여러 파일에 걸친 절차라서 일부만 하면 UI가 깨진다.
---

# RSS 피드 추가/수정/비활성화

피드 목록의 단일 소스는 `scripts/rss/feeds.js`의 `RSS_FEEDS`이며, 크롤러와 검증 스크립트가 이 파일을 공유한다. 그러나 피드 하나를 "제대로" 추가하려면 로고 매핑까지 함께 챙겨야 한다 — 로고가 없으면 UI에서 해당 블로그 카드에 로고가 비어 보인다.

## 새 피드 추가

1. **RSS URL 검증부터.** 피드를 등록하기 전에 URL이 실제로 유효한 피드인지 확인한다:
   ```bash
   node scripts/validate-rss.js --url <RSS_URL> --verbose
   ```
   실패하면 흔한 변형을 시도해 본다: `/rss`, `/rss.xml`, `/feed`, `/feed.xml`, `/atom.xml`, Medium이면 `https://medium.com/feed/<publication>`.

2. **`scripts/rss/feeds.js`의 `RSS_FEEDS`에 추가.**
   ```js
   { name: "블로그명", url: "RSS_URL", type: "company" | "personal" }
   ```
   - `name`은 기존 항목과 중복되지 않게. UI 표기·로고 매핑·중복 검사의 키로 쓰이므로 한 번 정하면 바꾸기 어렵다.
   - `type`: 기업 블로그는 `company`, 개인 블로그는 `personal`. 개인 블로그만 AI 비기술 판정 게이트를 통과해야 하므로 이 값이 틀리면 필터 동작이 달라진다.
   - 특정 분야 전문 블로그면 `category` 필드를 추가할 수 있다 (`"FE" | "BE" | "AI" | "APP"`). 이 값은 `scripts/ai-tags.js`의 `baseTagsFromFeedCategory()`를 통해 기본 태그로 변환된다.

3. **로고 추가.**
   - 해당 블로그의 파비콘/로고를 구해 `public/logos/<slug>.ico`로 저장한다 (보통 `https://<블로그도메인>/favicon.ico`).
   - `lib/logos.ts`의 `logoMap`에 `블로그명: "/logos/<slug>.ico"` 매핑을 추가한다. **키는 feeds.js의 `name`과 정확히 일치해야 한다.**

4. **전체 검증 실행.**
   ```bash
   pnpm validate-rss
   ```
   새 피드가 유효로 나오는지 확인한다. (다른 피드의 일시적 429는 재시도 로직이 처리하므로 새 피드 결과에 집중.)

5. **타입 체크**: `npx tsc --noEmit`

새 글 수집은 커밋/푸시 후 GitHub Actions 크롤러(하루 2회, 또는 크롤러 관련 파일 push 시 자동 트리거)가 수행한다. 즉시 확인이 필요하면 crawler-ops 스킬을 참고해 로컬에서 크롤러를 돌린다.

## 피드 URL 변경 (도메인 이전 등)

`feeds.js`에서 URL만 교체하고 1번의 단일 URL 검증을 돌린다. `name`은 바꾸지 않는다 — 바꾸면 기존 글과의 author 기반 중복 검사가 끊어져 같은 글이 중복 수집될 수 있다.

## 피드 비활성화 (피드 사망/블로그 폐쇄)

이 프로젝트의 관례는 **삭제가 아니라 주석 처리**다 (git 히스토리 참고: 여기어때, 마켓컬리 사례). 주석 처리된 항목은 배열에서 빠지므로 크롤러/검증 대상에서 자연히 제외된다. 나중에 부활할 수 있으니 주석으로 남겨 둔다. `lib/logos.ts`의 로고 매핑은 그대로 둔다 — 이미 수집된 글의 로고 표시에 계속 쓰인다.

## 커밋

한국어 커밋 메시지, 기존 관례를 따른다:
- 추가: `feat: ○○ 기술블로그 RSS 피드 추가`
- URL 변경: `fix: ○○ RSS 피드 URL을 신규 도메인으로 변경`
- 비활성화: `chore: ○○ 블로그 주소 주석처리`
