// 비기술 글(운동, 일상 기록 등)을 수집 대상에서 제외하는 규칙 필터.
// AI 태그 생성 전에 실행되므로 걸러진 글은 Fireworks 호출 비용이 들지 않는다.
// 전역 규칙은 모든 피드에 공통으로 적용되고,
// 피드별 예외는 feeds.js의 excludePatterns 옵션으로 관리한다.

// [운동], [일상] 등 비기술 카테고리 프리픽스
const EXCLUDED_PREFIX_PATTERN = /^\s*\[(운동|일상|여행|취미|잡담|먹방)\]/;

// "2026년 05월 30일 ..." 같은 날짜 기록성 제목
const DATE_LOG_PATTERN = /^\s*\d{4}년\s*\d{1,2}월\s*\d{1,2}일/;

export function getExclusionReason(article, feedConfig) {
  const title = (article.title || "").trim();

  if (EXCLUDED_PREFIX_PATTERN.test(title)) {
    return "비기술 카테고리 프리픽스";
  }

  if (DATE_LOG_PATTERN.test(title)) {
    return "날짜 기록성 제목";
  }

  for (const pattern of feedConfig?.excludePatterns || []) {
    if (pattern.test(title)) {
      return `피드 제외 패턴 (${pattern.source})`;
    }
  }

  return null;
}
