// 비기술 글(운동, 일상 기록 등)을 수집 대상에서 제외하는 필터.
// 수집 제외 정책은 전부 이 모듈에 모은다: 규칙(getExclusionReason)과 AI 판정(isNonTechClassification).

// [운동], [일상] 등 확실한 비기술 카테고리 프리픽스만 규칙으로 자른다.
// 애매한 신호(날짜로 시작하는 제목, [잡담] 등)는 여기서 자르지 않고 AI 판정에 맡긴다.
const EXCLUDED_PREFIX_PATTERN = /^\s*\[(운동|일상|여행|먹방)\]/;

// AI 태그 생성 전에 실행되므로 여기서 걸러진 글은 Fireworks 호출 비용이 들지 않는다.
export function getExclusionReason(article) {
  const title = (article.title || "").trim();

  if (EXCLUDED_PREFIX_PATTERN.test(title)) {
    return "비기술 카테고리 프리픽스";
  }

  return null;
}

// AI 판정 기반 제외. 개인 블로그 글에만 적용하고,
// 모델이 원본 응답을 빈 배열로 준 경우(nonTech)만 비기술로 본다.
// 판정 실패(unavailable/error)나 화이트리스트 밖 태그만 고른 경우는 저장한다.
export function isNonTechClassification(article, classification) {
  return (
    article.blog_type === "personal" &&
    classification.status === "ok" &&
    classification.nonTech === true
  );
}
