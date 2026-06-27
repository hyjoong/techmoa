// 중복 방지 관련 유틸 (RSS 크롤러 전용)

// URL 정규화 함수
export function normalizeUrl(url) {
  try {
    const urlObj = new URL(url);
    // 쿼리 파라미터 제거 (utm_source, fbclid, RSS 파라미터 등)
    const paramsToRemove = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "fbclid",
      "gclid",
      "fromRss",
      "trackingCode",
      "source",
      "rss",
    ];
    paramsToRemove.forEach((param) => urlObj.searchParams.delete(param));

    // 해시 제거
    urlObj.hash = "";

    // 마지막 슬래시 제거
    let cleanUrl = urlObj.toString();
    if (cleanUrl.endsWith("/") && cleanUrl !== urlObj.origin + "/") {
      cleanUrl = cleanUrl.slice(0, -1);
    }

    return cleanUrl;
  } catch (error) {
    return url; // 정규화 실패 시 원본 반환
  }
}

// 중복 검사 함수
export function isDuplicate(article, existingData) {
  const { urlSet, authorTitleMap } = existingData;

  // 1. URL 기반 중복 체크 (정규화된 URL로 비교)
  if (urlSet.has(article.external_url)) {
    return { isDuplicate: true, reason: "URL 중복", url: article.external_url };
  }

  // 2. 작성자+제목 기반 중복 체크 (원본 제목 사용, DB 제약조건과 일치)
  const authorTitle = `${article.author}:${article.title}`;

  if (authorTitleMap.has(authorTitle)) {
    const existing = authorTitleMap.get(authorTitle);
    return {
      isDuplicate: true,
      reason: "작성자+제목 중복",
      title: article.title,
      existingUrl: existing.external_url,
    };
  }

  return { isDuplicate: false };
}
