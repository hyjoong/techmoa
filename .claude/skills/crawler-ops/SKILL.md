---
name: crawler-ops
description: techgom RSS 크롤러의 로컬 실행·디버깅·운영 절차 — 크롤러를 직접 돌리거나, 특정 글이 수집 안 되는/잘못 수집되는 원인 추적, 비기술 글 필터(excluded_articles) 동작 확인, GitHub Actions 크롤링 실패 조사, Supabase 수동 DDL 적용. 사용자가 "크롤러 돌려봐", "○○ 글이 왜 안 들어왔지", "크롤링이 실패했어", "이 글 수집에서 빼줘/다시 넣어줘"라고 하면 반드시 이 스킬을 사용할 것.
---

# 크롤러 실행/디버깅/운영

## 파이프라인 한 장 요약

```
scripts/rss-crawler.js (엔트리, dotenv 로드)
 └─ lib/server/rss-crawler-service.js :: runRssCrawl()
     1. 기존 글 전체 + excluded_articles URL 인덱스 로드
     2. 피드별 순회 (RSS_FEEDS, 피드 간 1초 지연):
        a. 파싱 → 요약/썸네일 추출 (scripts/rss/summary.js, thumbnail.js)
        b. 중복 검사 (scripts/rss/dedup.js — URL 정규화 + author:title)
        c. 규칙 필터 (scripts/rss/filter.js — [운동]/[일상]/[여행]/[먹방] 프리픽스)
        d. AI 태그 생성 (scripts/ai-tags.js, 요청 간 8초 지연)
        e. AI 비기술 판정 → 개인 블로그 + 빈 태그 응답이면 수집 제외
        f. blogs 테이블 insert → 푸시 알림 처리
     3. 완료 후 배치 푸시 알림 + Discord 웹훅
```

제외된 글(c, e)은 `excluded_articles` 테이블에 기록되고, 다음 크롤링부터 중복으로 취급되어 AI 재판정 비용이 발생하지 않는다.

## 로컬 실행

```bash
pnpm crawl-rss
```

`.env`에 필요한 값: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (필수), `FIREWORKS_API_KEY` (태그 생성), `DISCORD_WEBHOOK_URL`·`FIREBASE_SERVICE_ACCOUNT_KEY` (알림, 선택).

**주의: 로컬 실행도 프로덕션 DB에 쓰고 실제 알림을 보낸다.** 드라이런 모드는 없다. 수집 로직만 테스트하려면 알림 없이 돌리는 방법을 쓴다:

```bash
# dotenv 로드는 엔트리 스크립트에만 있으므로 서비스 모듈을 직접 부를 땐 --env-file 필수
node --env-file=.env -e "import('./lib/server/rss-crawler-service.js').then(m => m.runRssCrawl({ sendNotifications: false }))"
```

특정 피드 하나만 테스트하려면 `runRssCrawl({ feeds: [...], sendNotifications: false })`에 피드 객체를 직접 넘긴다.

제어 env: `TAG_REQUEST_DELAY_MS` (기본 8000ms — Fireworks 레이트리밋이 낮아 줄이면 429), `RSS_FEED_DELAY_MS` (기본 1000ms).

## 운영 (GitHub Actions)

- `.github/workflows/rss-crawler.yml` — 한국시간 오전 7시/오후 7시 + 크롤러 관련 파일 push 시 + 수동 트리거(`gh workflow run rss-crawler.yml`)
- 실패 조사: `gh run list --workflow=rss-crawler.yml` → `gh run view <id> --log-failed`
- secrets에 env가 들어 있으므로 새 env를 추가하면 워크플로우 yml과 GitHub secrets 양쪽에 등록해야 한다.

## "글이 안 들어왔어요" 디버깅 순서

1. **피드 자체가 죽었나**: `node scripts/validate-rss.js --url <피드URL> --verbose`
2. **중복으로 걸렸나**: URL 정규화 후 `blogs.external_url` 또는 `author:title` 키가 이미 존재하는지 확인
3. **제외 기록에 있나**: `excluded_articles`에서 해당 URL 검색. `reason` 컬럼에 "비기술 카테고리 프리픽스" 또는 "AI 비기술 판정"이 남는다
4. **오탐이면 복구**: `excluded_articles`에서 해당 행을 삭제해야 다음 크롤링에서 다시 수집 시도한다. AI 오판이 반복되는 유형이면 `scripts/ai-tags.js` 프롬프트의 판정 규칙(회고=기술 글 등)을 보강
5. **잘못 수집된 글 제거**: `blogs`에서 삭제 + 같은 URL을 `excluded_articles`에 insert (안 하면 다음 크롤링에 되살아난다)

## Supabase 수동 DDL

`scripts/sql/*.sql`은 자동 마이그레이션이 아니다. 새 테이블/함수가 필요하면:
1. DDL을 `scripts/sql/`에 파일로 남기고
2. Supabase 대시보드 → SQL Editor에서 수동 실행한다
3. 코드는 테이블 부재 시에도 죽지 않게 경고만 남기고 계속 진행하는 패턴을 따른다 (`rss-crawler-service.js`의 `recordExclusion` 참고)

현재 수동 DDL 대상: `scripts/sql/excluded_articles.sql`, `scripts/create-blogs-table.sql`, `scripts/create-increment-views-function.sql`
