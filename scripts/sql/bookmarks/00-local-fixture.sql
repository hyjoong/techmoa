-- 폐기 가능한 빈 PostgreSQL DB 전용. 운영 Supabase에는 실행하지 않는다.
-- Supabase Auth 전체가 아닌 auth.uid()와 DB 역할만 흉내 낸다.
BEGIN;
DO $$ BEGIN
  IF to_regclass('public.bookmarks') IS NOT NULL OR to_regclass('public.blogs') IS NOT NULL
     OR to_regclass('auth.users') IS NOT NULL THEN
    RAISE EXCEPTION '빈 학습용 DB에서만 실행하세요. 기존 테이블을 삭제하지 않습니다.';
  END IF;
END $$;

CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA auth, public TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon;

CREATE TABLE public.blogs (id integer PRIMARY KEY, title text NOT NULL);
CREATE TABLE public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  blog_id integer,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT ON public.blogs TO authenticated, anon;
-- 테이블 권한이 있어도 RLS가 익명 접근을 차단하는지 확인하기 위한 로컬 설정이다.
GRANT SELECT, INSERT, DELETE, UPDATE ON public.bookmarks TO authenticated, anon;

INSERT INTO auth.users VALUES ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002');
INSERT INTO public.blogs VALUES (1, '학습 글 A'), (2, '학습 글 B'), (3, '학습 글 C');
INSERT INTO public.bookmarks (user_id, blog_id) VALUES ('00000000-0000-4000-8000-000000000002', 2);
COMMIT;
