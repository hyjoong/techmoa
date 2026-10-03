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
        /<h3[^>]*class="[^"]*subtitle[^"]*"[^>]*>(.*?)<\/h3>/i,
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

// NHN Cloud의 Markdown 링크에 포함된 괄호와 연결된 이미지까지 함께 건너뛴다.
function findClosingDelimiter(text, start, open, close) {
  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    if (text[index] === "\\") {
      index += 1;
      continue;
    }
    if (text[index] === open) depth += 1;
    if (text[index] === close && --depth === 0) return index;
  }
  return -1;
}

function removeMarkdownLinks(text) {
  let result = "";
  for (let index = 0; index < text.length; index += 1) {
    const isImage = text[index] === "!" && text[index + 1] === "[";
    const start = isImage ? index + 1 : index;
    if (text[start] === "[") {
      const labelEnd = findClosingDelimiter(text, start, "[", "]");
      if (labelEnd !== -1 && text[labelEnd + 1] === "(") {
        const linkEnd = findClosingDelimiter(text, labelEnd + 1, "(", ")");
        if (linkEnd !== -1) {
          if (!isImage) {
            result += removeMarkdownLinks(text.slice(start + 1, labelEnd));
          }
          index = linkEnd;
          continue;
        }
      }
    }
    result += text[index];
  }
  return result;
}

function cleanNhnMarkdown(content) {
  const text = removeMarkdownLinks(
    content
      .replace(/\r+\n?/g, "\n")
      .replace(/<!--[^]*?-->/g, " ")
      .replace(/<(script|style|pre)\b[^>]*>[^]*?<\/\1>/gi, " ")
      .replace(/<\/?(?:p|div|br|h[1-6]|li)\b[^>]*>/gi, "\n")
      .replace(/<[^>]*>/g, ""),
  );
  let fence = null;
  const prose = text.split("\n").filter((line) => {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) {
        fence = null;
      }
      return false;
    }
    // 제목과 코드 블록 대신 첫 본문부터 요약한다.
    return !fence && !/^\s*(?:#{1,6}\s|(?:[-*_]\s*){3,}$)/.test(line);
  });
  return prose
    .join("\n")
    .replace(/^\s*(?:>\s*)+/gm, "")
    .replace(/^\s*(?:[-+*]|\d+[.)])\s+/gm, "")
    .replace(/`+([^`\n]+)`+/g, "$1")
    .replace(/(\*\*|__|~~)([^]*?)\1/g, "$2")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .replace(/(?<!\w)_([^_\n]+)_(?!\w)/g, "$1")
    .replace(/https?:\/\/[^\s<>]+/gi, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#(?:39|x27);/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// 요약문 생성 (피드별 특화 처리)
export function createSummary(content, feedConfig = null, item = null) {
  // Medium 피드인 경우 특별 처리
  if (feedConfig && feedConfig.url.includes("medium.com")) {
    return createMediumSummary(item);
  }

  if (
    /^https?:\/\/meetup\.nhncloud\.com(?:[/:?#]|$)/i.test(feedConfig?.url || "")
  ) {
    // 잘린 snippet이나 배너만 남은 소스보다 전체 원문을 먼저 사용한다.
    const sources = [
      item?.["content:encoded"],
      item?.content,
      item?.description,
      item?.summary,
      content,
      item?.contentSnippet,
    ].filter((source) => typeof source === "string" && source.trim());
    const hasMarkdown = sources.some((source) =>
      /!?\[[^\n]*\]\(|(?:^|\n)\s*(?:#{1,6}\s|>|`{3,}|~{3,})|\*\*[^]+?\*\*/.test(
        source,
      ),
    );
    if (hasMarkdown) {
      for (const source of sources) {
        const cleaned = cleanNhnMarkdown(source);
        if (cleaned) {
          return cleaned.length > 200
            ? cleaned.substring(0, 200) + "..."
            : cleaned;
        }
      }
      return "";
    }
  }

  // 기존 로직
  if (!content) return "";
  const cleaned = stripHtml(content);
  return cleaned.length > 200 ? cleaned.substring(0, 200) + "..." : cleaned;
}
