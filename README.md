# Techmoa - 기술 블로그 모음집

국내 주요 기업과 개발자들의 기술 블로그를 한곳에서 모아보는 아그리게이터 서비스입니다.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://techmoa.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

## 🚀 주요 기능

### 📊 블로그 분류

- **기업 블로그**: 토스, 카카오, 우아한형제들 등 기업 기술 블로그
- **개인 블로그**: 개발자 개인 블로그 및 기술 아티클

### 🤖 자동 데이터 수집

- RSS 피드 자동 크롤링

## 🛠 기술 스택

- **프레임워크**: Next.js 15.2.4 (App Router)
- **언어**: TypeScript
- **스타일링**: Tailwind CSS + shadcn/ui
- **데이터베이스**: Supabase
- **배포**: Vercel
- **패키지 매니저**: pnpm

## 🚀 시작하기

### 1. 환경 설정

```bash
# 저장소 클론
git clone https://github.com/hyjoong/techmoa.git
cd techmoa

# 의존성 설치
pnpm install

# 환경 변수 설정
cp .env.example .env.local
```

### 2. Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. 환경 변수 설정:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # RSS 크롤러용
   ```

3. 데이터베이스 스키마 생성:

   ```sql
   -- Supabase SQL Editor에서 실행
   \i scripts/create-blogs-table.sql
   \i scripts/create-increment-views-function.sql
   ```

### 3. 개발 서버 실행

```bash
pnpm dev
```

### 4. RSS 크롤링 실행

```bash
node scripts/rss-crawler.js
```

## 🤝 기여하기

기여를 환영합니다! 새로운 기술 블로그를 추가하는 것만으로도 큰 도움이 됩니다.

### 🚀 빠른 기여 방법

1. [Fork](https://github.com/hyjoong/techmoa/fork) the Project
2. `scripts/rss-crawler.js` 파일에서 RSS 피드 목록에 추가
3. PR 생성 (자동으로 템플릿 적용됨)
4. 블로그 정보만 입력하면 끝!

> 📖 **자세한 가이드**: [CONTRIBUTING.md](CONTRIBUTING.md)를 참조하세요!

### 기여 가이드라인

- 새로운 기술 블로그 추가
- UI/UX 개선
- 성능 최적화
- 버그 수정
- 문서 개선

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.
