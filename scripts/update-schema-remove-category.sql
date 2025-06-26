-- 카테고리 컬럼 제거 (기존 데이터가 있을 경우를 대비해 IF EXISTS 사용)
ALTER TABLE blogs DROP COLUMN IF EXISTS category;

-- 카테고리 관련 인덱스가 있다면 제거
DROP INDEX IF EXISTS idx_blogs_category; 