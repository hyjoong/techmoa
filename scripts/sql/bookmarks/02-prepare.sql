-- 자동 실행하지 않는다. 01-audit.sql 결과 확인 후 Supabase SQL Editor에서 수동 적용한다.
-- 기존 테이블/데이터를 사용한다. 중복, 잘못된 참조, 모르는 정책은 지우지 않고 중단한다.
-- 실패하면 이 트랜잭션의 변경은 모두 취소된다. 같은 파일을 다시 실행할 수 있다.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $$
DECLARE
  bookmark_table regclass := to_regclass('public.bookmarks');
  blog_table regclass := to_regclass('public.blogs');
  user_table regclass := to_regclass('auth.users');
  bookmark_user smallint;
  bookmark_blog smallint;
  bookmark_id smallint;
  target_id smallint;
  source_attribute smallint;
  target_table regclass;
  constraint_name text;
  blog_type oid;
BEGIN
  IF bookmark_table IS NULL OR blog_table IS NULL OR user_table IS NULL THEN
    RAISE EXCEPTION 'bookmarks / blogs / auth.users가 필요합니다. 운영 DB 구조부터 확인하세요.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated' AND NOT rolsuper AND NOT rolbypassrls)
     OR EXISTS (SELECT 1 FROM pg_class c JOIN pg_roles r ON r.oid = c.relowner WHERE c.oid = bookmark_table AND r.rolname = 'authenticated') THEN
    RAISE EXCEPTION 'authenticated는 RLS를 우회하지 않는 일반 역할이어야 합니다.';
  END IF;
  IF to_regprocedure('auth.uid()') IS NULL THEN
    RAISE EXCEPTION '인증 사용자 ID를 반환하는 auth.uid() 함수가 필요합니다.';
  END IF;

  -- 점검과 변경 사이에 쓰기 요청이나 정책 변경이 끼어들지 않도록 잠근다.
  LOCK TABLE public.bookmarks IN ACCESS EXCLUSIVE MODE;

  SELECT attnum INTO bookmark_id FROM pg_attribute
  WHERE attrelid = bookmark_table AND attname = 'id' AND atttypid = 'uuid'::regtype AND NOT attisdropped
    AND atthasdef;
  SELECT attnum INTO bookmark_user FROM pg_attribute
  WHERE attrelid = bookmark_table AND attname = 'user_id' AND atttypid = 'uuid'::regtype AND NOT attisdropped;
  SELECT atttypid INTO blog_type FROM pg_attribute WHERE attrelid = blog_table AND attname = 'id' AND NOT attisdropped;
  SELECT attnum INTO bookmark_blog FROM pg_attribute
  WHERE attrelid = bookmark_table AND attname = 'blog_id' AND atttypid = blog_type AND NOT attisdropped;
  IF bookmark_id IS NULL OR bookmark_user IS NULL OR bookmark_blog IS NULL
     OR blog_type NOT IN ('integer'::regtype, 'bigint'::regtype)
     OR NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = bookmark_table AND attname = 'created_at' AND atttypid = 'timestamptz'::regtype AND NOT attisdropped)
     OR NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = bookmark_table AND contype = 'p' AND conkey = ARRAY[bookmark_id]) THEN
    RAISE EXCEPTION '지원 구조: 기본값/PK가 있는 id UUID, user_id UUID, blogs.id와 같은 integer/bigint blog_id, created_at timestamptz. 자동 형변환하지 않습니다.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = bookmark_table AND attnum > 0 AND NOT attisdropped
             AND attname NOT IN ('id', 'user_id', 'blog_id', 'created_at')
             AND attnotnull AND NOT atthasdef AND attidentity = '' AND attgenerated = '') THEN
    RAISE EXCEPTION 'API가 입력하지 않는 추가 필수 열이 있습니다. 기본값/입력 계약을 별도로 검토하세요.';
  END IF;

  -- 모르는 permissive 정책을 남겨두면 정책의 OR 결합으로 사용자 격리가 무효화될 수 있다.
  -- restrictive 정책도 새 API 접근을 막을 수 있으므로 일단 수동 검토를 요구한다.
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bookmarks'
             AND policyname NOT IN ('bookmarks_api_select_own', 'bookmarks_api_insert_own', 'bookmarks_api_delete_own')) THEN
    RAISE EXCEPTION '기존 북마크 RLS 정책을 먼저 검토하세요. 이 스크립트는 알 수 없는 정책을 삭제하지 않습니다.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.bookmarks WHERE user_id IS NULL OR blog_id IS NULL OR created_at IS NULL) THEN
    RAISE EXCEPTION 'NULL 데이터가 있습니다. 원인을 확인하고 별도 데이터 보정 계획을 세우세요.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.bookmarks GROUP BY user_id, blog_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION '중복 북마크가 있습니다. 보존할 데이터를 결정한 뒤 수동 정리하세요. 자동 삭제하지 않습니다.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.bookmarks b LEFT JOIN auth.users u ON u.id = b.user_id WHERE u.id IS NULL)
     OR EXISTS (SELECT 1 FROM public.bookmarks b LEFT JOIN public.blogs p ON p.id = b.blog_id WHERE p.id IS NULL) THEN
    RAISE EXCEPTION '존재하지 않는 사용자/글을 참조합니다. 원인 확인 전 변경하지 않습니다.';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = bookmark_table AND contype = 'u' AND condeferrable
             AND conkey @> ARRAY[bookmark_user, bookmark_blog] AND array_length(conkey, 1) = 2) THEN
    RAISE EXCEPTION '지연 유일 제약은 지원하지 않습니다. 즉시 적용되는 유일 제약으로 별도 변경하세요.';
  END IF;

  ALTER TABLE public.bookmarks ALTER COLUMN user_id SET NOT NULL,
    ALTER COLUMN blog_id SET NOT NULL, ALTER COLUMN created_at SET NOT NULL;
  -- API는 생성 시간을 입력받지 않으므로 DB가 생성 시간을 채운다.
  IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = bookmark_table AND attname = 'created_at' AND atthasdef) THEN
    ALTER TABLE public.bookmarks ALTER COLUMN created_at SET DEFAULT now();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = bookmark_table AND contype IN ('u', 'p')
                 AND NOT condeferrable AND conkey @> ARRAY[bookmark_user, bookmark_blog] AND array_length(conkey, 1) = 2) THEN
    ALTER TABLE public.bookmarks ADD CONSTRAINT bookmarks_api_user_blog_key UNIQUE (user_id, blog_id);
  END IF;

  FOR source_attribute, target_table, constraint_name IN
    SELECT bookmark_user, user_table, 'bookmarks_api_user_fk'
    UNION ALL SELECT bookmark_blog, blog_table, 'bookmarks_api_blog_fk'
  LOOP
    SELECT attnum INTO target_id FROM pg_attribute WHERE attrelid = target_table AND attname = 'id' AND NOT attisdropped;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = bookmark_table AND contype = 'f' AND source_attribute = ANY(conkey)
               AND (conkey <> ARRAY[source_attribute] OR confrelid <> target_table OR confkey <> ARRAY[target_id] OR confdeltype <> 'c' OR NOT convalidated)) THEN
      RAISE EXCEPTION '기존 외래키가 예상한 단일 열 참조 / ON DELETE CASCADE와 다릅니다. 별도로 검토하세요.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = bookmark_table AND contype = 'f' AND conkey = ARRAY[source_attribute]) THEN
      EXECUTE format('ALTER TABLE public.bookmarks ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES %s(id) ON DELETE CASCADE',
        constraint_name, CASE WHEN source_attribute = bookmark_user THEN 'user_id' ELSE 'blog_id' END, target_table);
    END IF;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS bookmarks_api_user_created_id_idx ON public.bookmarks (user_id, created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS bookmarks_api_blog_idx ON public.bookmarks (blog_id);
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bookmarks_api_select_own ON public.bookmarks;
CREATE POLICY bookmarks_api_select_own ON public.bookmarks FOR SELECT TO authenticated USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS bookmarks_api_insert_own ON public.bookmarks;
CREATE POLICY bookmarks_api_insert_own ON public.bookmarks FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS bookmarks_api_delete_own ON public.bookmarks;
CREATE POLICY bookmarks_api_delete_own ON public.bookmarks FOR DELETE TO authenticated USING ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, DELETE ON public.bookmarks TO authenticated;
-- UPDATE 정책을 만들지 않는다. PUT은 INSERT 후 유일 제약 충돌이면 기존 행을 다시 읽는다.
COMMIT;
