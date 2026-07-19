# CLAUDE.md

## 프로젝트 개요

국내 기업/개인 기술 블로그를 RSS로 크롤링해 모아 보여주는 아그리게이터 서비스 (techmoa).

- Next.js 15 (App Router) + React 19 + TypeScript
- Supabase (PostgreSQL) + shadcn/ui + Tailwind CSS
- 크롤링은 GitHub Actions에서 하루 2회 실행 (`.github/workflows/rss-crawler.yml`)
- 패키지 매니저는 pnpm

## 자주 쓰는 명령어

```bash
pnpm dev              # 개발 서버
pnpm build            # 프로덕션 빌드
npx tsc --noEmit      # 타입 체크 (커밋 전 통과 필수)
pnpm validate-rss     # 전체 RSS 피드 유효성 검사
pnpm crawl-rss        # 크롤러 로컬 실행 (env 필요 — crawler-ops 스킬 참고)
pnpm backfill-tags    # 태그 백필 (tag-pipeline 스킬 참고)
```

## 아키텍처 핵심

- **크롤러 파이프라인**: `scripts/rss-crawler.js`(엔트리) → `lib/server/rss-crawler-service.js`(핵심 로직) → `scripts/rss/*`(피드 목록·중복 검사·필터·요약·썸네일 모듈)
- **태그 단일 소스**: `lib/tag-data.js`. UI 필터(`lib/tag-filters.ts`)와 AI 태그 생성(`scripts/ai-tags.js`)이 모두 여기서 파생된다. 태그 추가/삭제는 반드시 이 파일에서만 한다.
- **RSS 피드 단일 소스**: `scripts/rss/feeds.js`의 `RSS_FEEDS`. 크롤러와 검증 스크립트가 공유한다.
- **비기술 글 2단 필터**: 규칙 필터(`scripts/rss/filter.js`의 프리픽스 패턴) → AI 판정 게이트(개인 블로그만). 제외된 글은 `excluded_articles` 테이블에 기록해 재판정 비용을 막는다.

## 주의사항

- **`scripts/sql/*.sql`은 자동 마이그레이션이 아니다.** Supabase 대시보드 SQL Editor에서 수동 실행해야 한다. 새 테이블/함수 DDL을 추가하면 사용자에게 수동 실행이 필요하다고 알릴 것.
- Fireworks AI(태그 생성)는 레이트리밋이 낮다. 요청 간 지연(`TAG_REQUEST_DELAY_MS`, 기본 8초)을 줄이지 말 것.
- 서버 전용 코드(`lib/server/`)는 `SUPABASE_SERVICE_ROLE_KEY`를 쓴다. 클라이언트 코드에 절대 노출하지 말 것.

## 코딩 컨벤션

### TypeScript / React
- `any` 금지, 함수에 명시적 타입 지정
- type 선호, 단 React 컴포넌트 props는 interface (컴포넌트 위에 정의)
- 서버 컴포넌트 기본, `"use client"`는 필요한 경우에만
- 이벤트 핸들러는 `handle~` 명명, 함수형 컴포넌트만 사용

### 파일/명명
- 파일: kebab-case (`blog-card.tsx`), 컴포넌트: PascalCase, 함수: camelCase, 상수: UPPER_SNAKE_CASE
- 컴포넌트 `components/`, 페이지 `app/`, 유틸 `lib/`, 스크립트 `scripts/`, shadcn/ui는 `components/ui/`

### 스타일/UX
- 스타일링은 Tailwind CSS 클래스만 사용
- 에러 메시지는 한국어, 사용자 알림은 useToast/sonner
- 이미지는 next/image, 외부 링크는 `rel="noopener noreferrer"`
- 로딩 상태·스켈레톤 제공, 반응형(모바일 우선), aria-label 등 접근성 고려

### DB (Supabase)
- `lib/supabase.ts`의 기존 함수 활용, 새 DB 함수는 에러 처리 포함
- 에러는 `throw new Error(\`설명적인 메시지: ${error.message}\`)` 패턴

### 워크플로우
- 주석과 커밋 메시지는 한국어 (커밋 프리픽스는 feat/fix/refactor/chore/perf/ci 관례)
- 크롤러는 개별 피드 실패 시에도 계속 진행하는 에러 복원력 유지
