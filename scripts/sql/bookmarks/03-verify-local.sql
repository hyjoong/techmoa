-- 00-local-fixture.sql과 02-prepare.sql 실행 후 로컬 DB에서만 실행한다.
-- 테스트 데이터 변경은 마지막 ROLLBACK으로 모두 되돌린다. 오류는 테스트 실패다.
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';

DO $$
DECLARE affected integer;
BEGIN
  IF (SELECT count(*) FROM public.bookmarks) <> 0 THEN RAISE EXCEPTION 'A가 B의 행을 조회했습니다.'; END IF;
  INSERT INTO public.bookmarks (user_id, blog_id) VALUES (auth.uid(), 1);
  BEGIN
    INSERT INTO public.bookmarks (user_id, blog_id) VALUES (auth.uid(), 1);
    RAISE EXCEPTION '유일 제약이 중복을 허용했습니다.';
  EXCEPTION WHEN unique_violation THEN NULL; END;
  INSERT INTO public.bookmarks (user_id, blog_id) VALUES (auth.uid(), 1) ON CONFLICT (user_id, blog_id) DO NOTHING;
  IF (SELECT count(*) FROM public.bookmarks) <> 1 THEN RAISE EXCEPTION '반복 저장 후 행 수가 잘못됐습니다.'; END IF;
  BEGIN
    INSERT INTO public.bookmarks (user_id, blog_id) VALUES ('00000000-0000-4000-8000-000000000002', 3);
    RAISE EXCEPTION 'A가 B의 행을 생성했습니다.';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    INSERT INTO public.bookmarks (user_id, blog_id) VALUES (auth.uid(), 99999);
    RAISE EXCEPTION '존재하지 않는 글을 저장했습니다.';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;
  DELETE FROM public.bookmarks WHERE user_id = '00000000-0000-4000-8000-000000000002';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'A가 B의 행을 삭제했습니다.'; END IF;
  UPDATE public.bookmarks SET blog_id = 3;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'UPDATE 정책 없이 수정했습니다.'; END IF;
  DELETE FROM public.bookmarks WHERE user_id = auth.uid() AND blog_id = 1;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 1 THEN RAISE EXCEPTION '첫 삭제가 실패했습니다.'; END IF;
  DELETE FROM public.bookmarks WHERE user_id = auth.uid() AND blog_id = 1;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION '반복 삭제 결과가 잘못됐습니다.'; END IF;
  INSERT INTO public.bookmarks (user_id, blog_id) VALUES (auth.uid(), 1);
END $$;

SET LOCAL request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
DO $$ BEGIN
  IF (SELECT count(*) FROM public.bookmarks) <> 1 OR EXISTS (SELECT 1 FROM public.bookmarks WHERE blog_id <> 2) THEN
    RAISE EXCEPTION 'B의 목록 격리가 실패했습니다.';
  END IF;
END $$;

SET LOCAL ROLE anon;
SET LOCAL request.jwt.claim.sub = '';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.bookmarks) THEN RAISE EXCEPTION '익명 사용자가 행을 조회했습니다.'; END IF;
  BEGIN
    INSERT INTO public.bookmarks (user_id, blog_id) VALUES ('00000000-0000-4000-8000-000000000001', 3);
    RAISE EXCEPTION '익명 사용자가 행을 생성했습니다.';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

RESET ROLE;
DELETE FROM public.blogs WHERE id = 1;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.bookmarks WHERE blog_id = 1) THEN RAISE EXCEPTION '글 삭제 cascade가 실패했습니다.'; END IF;
END $$;
DELETE FROM auth.users WHERE id = '00000000-0000-4000-8000-000000000002';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.bookmarks WHERE user_id = '00000000-0000-4000-8000-000000000002') THEN
    RAISE EXCEPTION '사용자 삭제 cascade가 실패했습니다.';
  END IF;
END $$;
ROLLBACK;

DO $$ BEGIN
  IF (SELECT count(*) FROM public.bookmarks) <> 1 OR (SELECT count(*) FROM public.blogs) <> 3
     OR (SELECT count(*) FROM auth.users) <> 2 THEN RAISE EXCEPTION '테스트 rollback 후 원본 복구가 실패했습니다.'; END IF;
END $$;
