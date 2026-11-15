-- 운영 DB에서는 이 읽기 전용 점검부터 수동 실행한다. 사용자 ID/글 내용은 출력하지 않는다.
-- 마지막 집계는 public.bookmarks와 public.blogs, auth.users가 존재해야 실행할 수 있다.
BEGIN TRANSACTION READ ONLY;

SELECT n.nspname AS schema_name, c.relname AS table_name,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE (n.nspname, c.relname) IN (('public', 'bookmarks'), ('public', 'blogs'));

SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE (table_schema, table_name) IN (('public', 'bookmarks'), ('public', 'blogs'))
ORDER BY table_name, ordinal_position;

SELECT conname, contype, convalidated, pg_get_constraintdef(oid) AS definition
FROM pg_constraint WHERE conrelid = to_regclass('public.bookmarks')
ORDER BY conname;

SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'bookmarks';

SELECT policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'bookmarks';

SELECT grantee, privilege_type FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'bookmarks';

SELECT
  count(*) AS bookmark_count,
  count(*) FILTER (WHERE b.id IS NULL OR b.user_id IS NULL OR b.blog_id IS NULL OR b.created_at IS NULL) AS invalid_null_rows,
  count(*) FILTER (WHERE u.id IS NULL) AS missing_user_rows,
  count(*) FILTER (WHERE p.id IS NULL) AS missing_blog_rows,
  (SELECT count(*) FROM (
    SELECT user_id, blog_id FROM public.bookmarks GROUP BY user_id, blog_id HAVING count(*) > 1
  ) duplicates) AS duplicate_user_blog_pairs
FROM public.bookmarks b
LEFT JOIN auth.users u ON u.id = b.user_id
LEFT JOIN public.blogs p ON p.id = b.blog_id;

ROLLBACK;
