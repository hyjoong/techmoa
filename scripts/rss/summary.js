// 요약문 생성 관련 유틸 (RSS 크롤러 전용)

// 텍스트에서 HTML 태그 제거
export function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

// Medium 전용 요약 추출 함수
export function createMediumSummary(item) {
  // Medium RSS 피드에서 사용 가능한 콘텐츠 소스들 (우선순위 순)
  const contentSources = [
    item.contentSnippet,
    item["content:encoded"],
    item.content,
    item.summary,
    item.description,
  ];

  for (const content of contentSources) {
    if (!content) continue;

    let cleanedContent = stripHtml(content);

    // Medium 특화 처리
    if (content === item["content:encoded"] || content === item.content) {
      // Medium HTML에서 첫 번째 문단 추출
      const paragraphMatch = content.match(/<p[^>]*>(.*?)<\/p>/i);
      if (paragraphMatch && paragraphMatch[1]) {
        cleanedContent = stripHtml(paragraphMatch[1]);
      }

      // Medium의 subtitle 추출 시도
      const subtitleMatch = content.match(
        /<h3[^>]*class="[^"]*subtitle[^"]*"[^>]*>(.*?)<\/h3>/i
      );
      if (subtitleMatch && subtitleMatch[1]) {
        cleanedContent = stripHtml(subtitleMatch[1]);
      }
    }

    // 내용이 유효하면 요약 생성
    if (cleanedContent && cleanedContent.trim().length > 10) {
      return cleanedContent.length > 200
        ? cleanedContent.substring(0, 200) + "..."
        : cleanedContent;
    }
  }

  return ""; // 요약을 찾을 수 없는 경우
}

// 요약문 생성 (Medium 피드 특화)
export function createSummary(content, feedConfig = null, item = null) {
  // Medium 피드인 경우 특별 처리
  if (feedConfig && feedConfig.url.includes("medium.com")) {
    return createMediumSummary(item);
  }

  // 기존 로직
  if (!content) return "";
  const cleaned = stripHtml(content);
  return cleaned.length > 200 ? cleaned.substring(0, 200) + "..." : cleaned;
}
