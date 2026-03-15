# TechMoa 마이그레이션 분석 리포트

## 현재 아키텍처 요약

| 항목 | 현재 스택 |
|------|-----------|
| 프레임워크 | Next.js 15 (App Router) + React 19 |
| 데이터베이스 | **Supabase (PostgreSQL)** |
| 인증 | Supabase Auth (Google/GitHub OAuth) |
| 푸시 알림 | Firebase Admin SDK (FCM) |
| 배포 | Vercel |
| ORM | 없음 (Supabase JS SDK 직접 사용) |
| RSS 크롤링 | Node.js 스크립트 (수동/크론) |
| AI 태깅 | Fireworks AI (DeepSeek v3p1) |

> **중요 발견**: 현재 프로젝트는 순수 Firebase 기반이 아닙니다. DB와 Auth는 이미 Supabase(PostgreSQL)를 사용 중이며, Firebase는 푸시 알림(FCM)용으로만 사용됩니다.

---

## 1. Railway 마이그레이션 시 수정 파일 목록

### 1-1. DB 레이어 (Supabase SDK → Prisma)

| 파일 | 변경 내용 | 난이도 |
|------|-----------|--------|
| `lib/supabase.ts` | Supabase 클라이언트 → Prisma Client로 전면 교체. fetchBlogs, fetchWeeklyPopularBlogs 등 7개 함수 재작성 | 높음 |
| `lib/bookmarks.ts` | Supabase 쿼리 → Prisma 쿼리로 변환 (addBookmark, removeBookmark, getBookmarks, isBookmarked) | 중간 |
| `lib/auth.ts` | Supabase Auth 제거 → NextAuth.js 또는 자체 JWT 인증으로 교체 | 높음 |
| `hooks/use-auth.ts` | Supabase onAuthStateChange → 새 인증 시스템 연동 | 중간 |
| `hooks/use-infinite-blog-data.ts` | API 호출 방식 변경 (Supabase 직접 호출 → Next.js API Route 경유) | 중간 |
| `app/auth/callback/route.ts` | Supabase OAuth 콜백 → NextAuth 콜백으로 교체 | 중간 |
| `components/auth/*` | 인증 관련 컴포넌트 UI 수정 | 낮음 |
| `components/bookmark-button.tsx` | Supabase 의존성 제거 | 낮음 |

### 1-2. 신규 생성 파일

| 파일 | 목적 |
|------|------|
| `prisma/schema.prisma` | Prisma 스키마 (blogs, bookmarks, user_profiles, subscribers 모델 정의) |
| `lib/prisma.ts` | Prisma Client 싱글톤 인스턴스 |
| `app/api/blogs/route.ts` | 블로그 목록 API (GET) |
| `app/api/blogs/[id]/route.ts` | 블로그 상세/수정/삭제 API |
| `app/api/blogs/[id]/views/route.ts` | 조회수 증가 API (RPC 대체) |
| `app/api/blogs/weekly-popular/route.ts` | 주간 인기글 API |
| `app/api/bookmarks/route.ts` | 북마크 CRUD API |
| `app/api/cron/crawl/route.ts` | 크롤링 크론 API 엔드포인트 |
| `app/api/auth/[...nextauth]/route.ts` | NextAuth 인증 라우트 (선택 시) |

### 1-3. 크롤링 스크립트 수정

| 파일 | 변경 내용 |
|------|-----------|
| `scripts/rss-crawler.js` | Supabase SDK → Prisma Client. insert/select 쿼리 전면 교체 |
| `scripts/ai-tags.js` | 변경 없음 (Fireworks API 독립적) |
| `scripts/backfill-tags.js` | Supabase → Prisma 쿼리 변환 |
| `scripts/push-notification.js` | Firebase FCM 유지 또는 Web Push로 대체 |

### 1-4. 설정 파일

| 파일 | 변경 내용 |
|------|-----------|
| `package.json` | `@supabase/supabase-js`, `@supabase/auth-helpers-nextjs` 제거. `prisma`, `@prisma/client` 추가. 선택적으로 `next-auth` 추가 |
| `.env` / `.env.example` | `SUPABASE_*` → `DATABASE_URL` (Railway PostgreSQL 연결 문자열) |
| `next.config.mjs` | Railway 배포용 standalone output 설정 추가 |
| `Dockerfile` (신규) | Railway 배포용 Docker 설정 |

### 총 수정 파일 수: **약 15~20개**, 신규 생성: **약 10개**

---

## 2. Railway Hobby 플랜 예상 월 비용

### 비용 구조 (Railway Hobby Plan: $5/월 크레딧 포함)

#### 2-1. 서비스별 리소스 사용량 추정

**Next.js 서버 (Railway App Service)**

- 42개 피드, 일 2~3회 크롤링 기준
- 평균 메모리: ~256MB, CPU: 낮음
- 예상 트래픽: 일 1,000~5,000 PV (한국 개발자 대상 니치 서비스)
- 월 비용: **$3~5** (vCPU $0.000463/min + RAM $0.000231/GB/min)

**PostgreSQL (Railway Database)**

- 현재 데이터: 42개 피드 × 피드당 약 20~50개 글 = 약 1,000~2,000개 행
- 월 증가분: 42개 피드 × 일 평균 1~2개 신규 글 × 30일 = 약 1,200~2,500개/월
- 1년 후 예상: ~30,000행 (인덱스 포함 약 50~100MB)
- 월 비용: **$1~2** (스토리지 $0.25/GB)

**크론잡 (Railway Cron Service)**

- 일 2~3회 크롤링 × 42개 피드 × 피드당 ~2초 + AI 태깅 8초/글
- 1회 크롤링 실행 시간: 약 5~15분 (AI 태깅 포함)
- 월 크론 실행: 60~90회
- 월 비용: **$0.5~1** (실행 시간 비례)

#### 2-2. 월 비용 요약

| 항목 | 최소 | 최대 |
|------|------|------|
| Hobby 기본료 | $5 | $5 |
| Next.js 서버 | $3 | $5 |
| PostgreSQL | $1 | $2 |
| 크론잡 | $0.5 | $1 |
| **합계** | **$5** | **$8** |

> Hobby 플랜의 $5 크레딧은 사용량에서 차감되므로 실질 지불액은 **월 $0~$3** 수준입니다. 초기에는 $5 크레딧 내에서 충분히 운영 가능합니다.

#### 2-3. 추가 외부 비용

| 서비스 | 비용 | 비고 |
|--------|------|------|
| Fireworks AI (태깅) | ~$0~1/월 | DeepSeek 모델 저가. 일 5개 글 × 30일 = 150건/월 |
| Firebase FCM | 무료 | 푸시 알림 무료 티어 |
| 도메인 | ~$10~15/년 | 연 비용 |
| **외부 합계** | **~$1~2/월** | |

#### 총 예상 월 비용: **$5~$10/월** (Hobby 플랜 기본료 포함)

---

## 3. 이메일 알림 서비스 비교

### 비교 매트릭스

| 기준 | AWS SES | Resend | Nodemailer |
|------|---------|--------|------------|
| 무료 티어 | 월 62,000건 (EC2 기준) | 월 3,000건 (100건/일) | 무료 (SMTP 별도) |
| 가격 | $0.10/1,000건 | $20/월 (50K건) | SMTP 비용만 |
| 설정 난이도 | 높음 (AWS 계정, SES 인증, 리전 설정) | 낮음 (API 키 하나) | 중간 (SMTP 설정) |
| Next.js 통합 | aws-sdk 필요 | resend npm 패키지 (초간단) | nodemailer 패키지 |
| 도메인 인증 | 필수 (DKIM, SPF) | 필수 (간편 UI) | SMTP 제공자 의존 |
| 전달률 | 매우 높음 | 높음 | SMTP 의존 |
| React 이메일 | 수동 구현 | react-email 네이티브 지원 | 수동 구현 |
| 한국 발송 | 서울 리전 가능 | 글로벌 | SMTP 의존 |

### 추천: **Resend**

TechMoa 프로젝트에는 Resend가 가장 적합합니다. 이유는 다음과 같습니다.

1. **규모에 적합**: 구독자 수백~수천 명 수준에서 무료 또는 저가로 운영 가능
2. **Next.js 친화적**: react-email과 조합하면 JSX로 이메일 템플릿 작성 가능
3. **설정 최소화**: API 키 하나로 즉시 사용. AWS SES처럼 샌드박스 해제 절차 불필요
4. **개발 경험**: 타입스크립트 지원, 직관적 API, 대시보드에서 발송 로그 확인

#### 구현 예시 구조

```
app/api/email/
├── subscribe/route.ts      # 구독 등록
├── unsubscribe/route.ts    # 구독 해제
└── notify/route.ts         # 새 글 알림 발송 (크론에서 호출)

lib/
├── email.ts                # Resend 클라이언트 초기화
└── email-templates/
    ├── new-articles.tsx    # 새 글 알림 템플릿 (react-email)
    └── welcome.tsx         # 환영 이메일 템플릿

prisma/schema.prisma        # subscribers 모델 추가
```

#### 비용 예측

- 구독자 100명, 일 1회 발송 = 월 3,000건 → **무료**
- 구독자 500명, 일 1회 발송 = 월 15,000건 → **무료 초과 시 $20/월**
- 구독자 1,000명 이상 시 → AWS SES 전환 고려 ($0.10/1,000건)

---

## 4. 마이그레이션 태스크 리스트 (우선순위 순)

### Phase 1: 기반 구축 (1~2일)

- [ ] **1.1** Railway 프로젝트 생성 + PostgreSQL 프로비저닝
- [ ] **1.2** Supabase에서 기존 데이터 pg_dump로 백업
- [ ] **1.3** Prisma 초기 설정: `prisma init`, schema.prisma 작성 (blogs, bookmarks, user_profiles)
- [ ] **1.4** Railway PostgreSQL에 데이터 복원 (pg_restore)
- [ ] **1.5** `prisma db pull`로 스키마 검증 → `prisma generate`

### Phase 2: DB 레이어 전환 (2~3일)

- [ ] **2.1** `lib/prisma.ts` 생성 (Prisma Client 싱글톤)
- [ ] **2.2** `lib/supabase.ts` → Prisma 쿼리로 전면 재작성 (fetchBlogs, fetchWeeklyPopularBlogs 등)
- [ ] **2.3** Next.js API Routes 생성 (blogs CRUD, weekly-popular, views increment)
- [ ] **2.4** `lib/bookmarks.ts` → Prisma 쿼리 전환 + API Route 생성
- [ ] **2.5** 프론트엔드 hooks 수정 (Supabase 직접 호출 → fetch API Route)
- [ ] **2.6** `scripts/rss-crawler.js` Supabase SDK → Prisma 전환

### Phase 3: 인증 시스템 전환 (1~2일)

- [ ] **3.1** NextAuth.js 설치 + Google/GitHub OAuth Provider 설정
- [ ] **3.2** `app/api/auth/[...nextauth]/route.ts` 생성
- [ ] **3.3** `lib/auth.ts` 재작성 (Supabase Auth → NextAuth)
- [ ] **3.4** `hooks/use-auth.ts` 수정 (useSession 훅 전환)
- [ ] **3.5** `app/auth/callback/route.ts` 제거 또는 NextAuth 콜백으로 대체
- [ ] **3.6** 인증 관련 컴포넌트 수정 (로그인/회원가입 폼)

### Phase 4: 배포 + 크론 설정 (1일)

- [ ] **4.1** `Dockerfile` 작성 (Next.js standalone 빌드)
- [ ] **4.2** `next.config.mjs`에 `output: 'standalone'` 추가
- [ ] **4.3** Railway에 GitHub 연결 + 자동 배포 설정
- [ ] **4.4** 환경 변수 설정 (DATABASE_URL, NEXTAUTH_*, FIREWORKS_*)
- [ ] **4.5** Railway Cron Service 설정 (크롤링 API 호출)
- [ ] **4.6** 커스텀 도메인 연결

### Phase 5: 이메일 알림 기능 (1~2일)

- [ ] **5.1** Prisma 스키마에 subscribers 모델 추가
- [ ] **5.2** Resend 설정 + 도메인 인증
- [ ] **5.3** react-email 템플릿 작성 (새 글 알림, 환영 이메일)
- [ ] **5.4** 구독/해제 API Route 구현
- [ ] **5.5** 크롤링 후 신규 글 알림 발송 로직 추가
- [ ] **5.6** 이메일 알림 구독 UI 컴포넌트 추가

### Phase 6: 정리 + 검증 (1일)

- [ ] **6.1** Supabase 의존성 패키지 제거 (`@supabase/supabase-js` 등)
- [ ] **6.2** 전체 기능 통합 테스트 (크롤링 → DB → 알림 → UI)
- [ ] **6.3** Flutter WebView 브릿지 동작 확인
- [ ] **6.4** 성능 테스트 + 모니터링 설정
- [ ] **6.5** Supabase 프로젝트 아카이브 (백업 보관)

### 총 예상 기간: **7~11일** (1인 기준)
