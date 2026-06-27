// 썸네일 추출 관련 유틸 (RSS 크롤러 전용)

// 웹 페이지에서 Open Graph 이미지 추출 (토스, 올리브영 등)
export async function fetchThumbnailFromWeb(url, blogName = "웹") {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 10000,
    });

    if (!response.ok) {
      console.log(
        `❌ [${blogName} 썸네일] HTTP 에러 ${response.status}: ${url}`
      );
      return null;
    }

    const html = await response.text();

    // Open Graph 이미지 추출
    const ogImageMatch = html.match(
      /<meta[^>]+property="og:image"[^>]+content="([^"]+)"[^>]*>/i
    );
    if (ogImageMatch && ogImageMatch[1]) {
      console.log(`✅ [${blogName} 썸네일] 웹에서 추출: ${ogImageMatch[1]}`);
      return ogImageMatch[1];
    }

    // 다른 메타 이미지 태그들도 시도
    const twitterImageMatch = html.match(
      /<meta[^>]+name="twitter:image"[^>]+content="([^"]+)"[^>]*>/i
    );
    if (twitterImageMatch && twitterImageMatch[1]) {
      console.log(
        `✅ [${blogName} 썸네일] 트위터 메타에서 추출: ${twitterImageMatch[1]}`
      );
      return twitterImageMatch[1];
    }

    console.log(`❌ [${blogName} 썸네일] 메타 이미지 없음: ${url}`);
    return null;
  } catch (error) {
    console.log(`❌ [${blogName} 썸네일] 웹 접속 실패: ${error.message}`);
    return null;
  }
}

// 썸네일 URL 추출 (토스, 올리브영은 웹 스크래핑 사용)
export async function extractThumbnail(item, feedConfig = null) {
  // 웹 스크래핑이 필요한 블로그들 처리
  const webScrapingBlogs = [
    { domain: "toss.tech", name: "토스" },
    { domain: "oliveyoung.tech", name: "올리브영" },
    { domain: "tech.kakao.com", name: "카카오" },
    { domain: "tech.kakaopay.com", name: "카카오페이" },
    { domain: "techblog.woowahan.com", name: "우아한형제들" },
    { domain: "blog.banksalad.com", name: "뱅크샐러드" },
    { domain: "tech.devsisters.com", name: "데브시스터즈" },
    { domain: "d2.naver.com", name: "네이버" },
    { domain: "techblog.lycorp.co.jp", name: "라인" },
  ];

  for (const blog of webScrapingBlogs) {
    if (item.link && item.link.includes(blog.domain)) {
      console.log(`🔍 [${blog.name} 썸네일] 웹 스크래핑 시도: ${item.link}`);
      const webThumbnail = await fetchThumbnailFromWeb(item.link, blog.name);
      if (webThumbnail) {
        return webThumbnail;
      }
      console.log(
        `⚠️ [${blog.name} 썸네일] 웹 스크래핑 실패, 일반 방식으로 시도`
      );
      break; // 해당 블로그 처리 후 루프 종료
    }
  }

  // 1. enclosure 확인 (일반적인 RSS 첨부파일)
  if (item.enclosure?.url && item.enclosure.type?.startsWith("image/")) {
    return item.enclosure.url;
  }

  // 2. media:content 확인 (Media RSS)
  if (item["media:content"]?.$?.url) {
    return item["media:content"].$.url;
  }

  // 3. media:thumbnail 확인
  if (item["media:thumbnail"]?.$?.url) {
    return item["media:thumbnail"].$.url;
  }

  // 4. content에서 이미지 추출
  const content = item.content || item["content:encoded"] || item.summary || "";

  // 네이버 블로그 특별 처리
  if (item.link && item.link.includes("blog.naver.com")) {
    // 네이버 블로그 썸네일 패턴들
    const naverPatterns = [
      // 네이버 스마트에디터 이미지
      /<img[^>]+src="(https?:\/\/[^"]*(?:blogfiles\.naver\.net|phinf\.naver\.net|storep-phinf\.pstatic\.net)[^"]*)"[^>]*>/i,
      // 네이버 블로그 CDN 이미지
      /<img[^>]+src="(https?:\/\/[^"]*(?:postfiles\.pstatic\.net|blogfiles\.naver\.net)[^"]*)"[^>]*>/i,
      // 일반 이미지 태그
      /<img[^>]+src="([^"]+)"[^>]*>/i,
    ];

    for (const pattern of naverPatterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const imgUrl = match[1];
        // 네이버 이미지 URL 정리 (쿼리 파라미터 제거)
        const cleanUrl = imgUrl.split("?")[0];
        if (cleanUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i)) {
          return cleanUrl;
        }
      }
    }
  }

  // 5. 티스토리 블로그 특별 처리
  if (item.link && item.link.includes("tistory.com")) {
    const tistoryPattern =
      /<img[^>]+src="(https?:\/\/[^"]*(?:tistory\.com|daumcdn\.net)[^"]*)"[^>]*>/i;
    const match = content.match(tistoryPattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // 6. Velog 특별 처리
  if (item.link && item.link.includes("velog.io")) {
    const velogPattern =
      /<img[^>]+src="(https?:\/\/[^"]*(?:velog\.velcdn\.com|images\.velog\.io)[^"]*)"[^>]*>/i;
    const match = content.match(velogPattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  // 7. 일반 이미지 추출 (개선된 버전)
  const imgPatterns = [
    // data-src 속성 (lazy loading)
    /<img[^>]+data-src="([^"]+)"[^>]*>/i,
    // 일반 src 속성
    /<img[^>]+src="([^"]+)"[^>]*>/i,
    // srcset 속성에서 첫 번째 이미지
    /<img[^>]+srcset="([^"\s,]+)[^"]*"[^>]*>/i,
  ];

  for (const pattern of imgPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const imgUrl = match[1];

      // 유효한 이미지 URL인지 확인 (base64 제외)
      if (imgUrl.startsWith("data:")) continue;

      // 상대 URL인 경우 절대 URL로 변환
      if (imgUrl.startsWith("http")) {
        return imgUrl;
      }

      // RSS 피드 URL에서 도메인 추출하여 상대 URL을 절대 URL로 변환
      try {
        const feedUrl = new URL(item.link || "");
        const absoluteUrl = new URL(imgUrl, feedUrl.origin).href;
        return absoluteUrl;
      } catch (error) {
        // URL 변환 실패 시 다음 패턴으로 계속
        continue;
      }
    }
  }

  // 8. Open Graph 이미지 확인 (일부 블로그에서 사용)
  const ogImageMatch = content.match(
    /<meta[^>]+property="og:image"[^>]+content="([^"]+)"[^>]*>/i
  );
  if (ogImageMatch && ogImageMatch[1]) {
    return ogImageMatch[1];
  }

  return null;
}
