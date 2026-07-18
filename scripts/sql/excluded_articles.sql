-- 크롤링에서 수집 제외된 글 기록.
-- rss-crawler-service.js가 이 테이블의 URL을 중복으로 취급해
-- 피드에 남아있는 제외 글의 AI 재판정 비용을 막는다.
create table if not exists public.excluded_articles (
  id bigint generated always as identity primary key,
  external_url text not null unique,
  author text,
  title text,
  reason text,
  created_at timestamptz not null default now()
);

-- 서버(서비스 롤)에서만 쓰는 테이블이므로 anon 접근 차단
alter table public.excluded_articles enable row level security;
