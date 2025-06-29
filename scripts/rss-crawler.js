import dotenv from "dotenv";
dotenv.config();
import { createClient } from "@supabase/supabase-js";
import Parser from "rss-parser";

/**
 * RSS 피드 크롤러
 *
 * 새로운 블로그를 추가하려면:
 * 1. RSS_FEEDS 배열에 다음 형식으로 추가:
 *    { name: "블로그명", url: "RSS_URL", type: "company" | "personal" }
 * 2. RSS 피드가 정상 작동하는지 확인
 * 3. 블로그 타입을 올바르게 설정 (company: 기업, personal: 개인)
 * 4. 중복되지 않는 블로그명 사용
 *
 */

// RSS 피드 목록 (기업/개인 구분)
const RSS_FEEDS = [
  { name: "토스", url: "https://toss.tech/rss.xml", type: "company" },
  {
    name: "당근",
    url: "https://medium.com/feed/daangn",
    type: "company",
  },
  {
    name: "카카오",
    url: "https://tech.kakao.com/feed/",
    type: "company",
  },
  {
    name: "카카오페이",
    url: "https://tech.kakaopay.com/rss",
    type: "company",
  },
  {
    name: "무신사",
    url: "https://medium.com/feed/musinsa-tech",
    type: "company",
  },
  { name: "29CM", url: "https://medium.com/feed/29cm", type: "company" },
  {
    name: "올리브영",
    url: "https://oliveyoung.tech/rss.xml",
    type: "company",
  },
  {
    name: "우아한형제들",
    url: "https://techblog.woowahan.com/feed/",
    type: "company",
  },
  {
    name: "마켓컬리",
    url: "https://helloworld.kurly.com/feed.xml",
    type: "company",
  },
  {
    name: "에잇퍼센트",
    url: "https://8percent.github.io/feed.xml",
    type: "company",
  },
  {
    name: "쏘카",
    url: "https://tech.socarcorp.kr/feed",
    type: "company",
  },
  {
    name: "이스트소프트",
    url: "https://blog.est.ai/feed.xml",
    type: "company",
  },
  {
    name: "하이퍼커넥트",
    url: "https://hyperconnect.github.io/feed.xml",
    type: "company",
  },
  {
    name: "데브시스터즈",
    url: "https://tech.devsisters.com/rss.xml",
    type: "company",
  },
  {
    name: "뱅크샐러드",
    url: "https://blog.banksalad.com/rss.xml",
    type: "company",
  },
  { name: "왓챠", url: "https://medium.com/feed/watcha", type: "company" },
  {
    name: "다나와",
    url: "https://danawalab.github.io/feed.xml",
    type: "company",
  },
  {
    name: "요기요",
    url: "https://medium.com/feed/deliverytechkorea",
    type: "company",
  },
  {
    name: "쿠팡",
    url: "https://medium.com/feed/coupang-tech",
    type: "company",
  },
  {
    name: "원티드",
    url: "https://medium.com/feed/wantedjobs",
    type: "company",
  },
  {
    name: "데이블",
    url: "https://teamdable.github.io/techblog/feed.xml",
    type: "company",
  },
  { name: "직방", url: "https://medium.com/feed/zigbang", type: "company" },

  // 개인 블로그
  {
    name: "문동욱",
    url: "https://evan-moon.github.io/feed.xml",
    type: "personal",
  },
  {
    name: "손수림",
    url: "https://api.velog.io/rss/@surim014",
    type: "personal",
  },
  {
    name: "스벨트전도사",
    url: "https://api.velog.io/rss/@k-svelte-master",
    type: "personal",
  },
  {
    name: "우혁",
    url: "https://api.velog.io/rss/@woogur29",
    type: "personal",
  },
  {
    name: "정현수",
    url: "https://junghyeonsu.com/rss.xml",
    type: "personal",
  },
  {
    name: "테오",
    url: "https://api.velog.io/rss/@teo",
    type: "personal",
  },
  {
    name: "멍개",
    url: "https://rss.blog.naver.com/pjt3591oo.xml",
    type: "personal",
  },
];

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Supabase URL 또는 Service Role Key가 설정되지 않았습니다.");
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL:",
    supabaseUrl ? "✅ 설정됨" : "❌ 없음"
  );
  console.error(
    "SUPABASE_SERVICE_ROLE_KEY:",
    supabaseServiceKey ? "✅ 설정됨" : "❌ 없음"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  },
});

// 텍스트에서 HTML 태그 제거
function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

// 요약문 생성 (첫 200자)
function createSummary(content) {
  if (!content) return "";
  const cleaned = stripHtml(content);
  return cleaned.length > 200 ? cleaned.substring(0, 200) + "..." : cleaned;
}

// 썸네일 URL 추출
function extractThumbnail(item) {
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

// URL 정규화 함수
function normalizeUrl(url) {
  try {
    const urlObj = new URL(url);
    // 쿼리 파라미터 제거 (utm_source, fbclid 등)
    const paramsToRemove = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
      "fbclid",
      "gclid",
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

// 제목 정규화 함수
function normalizeTitle(title) {
  if (!title) return "";
  return title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s가-힣]/g, ""); // 특수문자 제거
}

// 기존 데이터 확인 (강화된 버전)
async function getExistingData() {
  try {
    const { data, error } = await supabase
      .from("blogs")
      .select("external_url, title, author, published_at");

    if (error) {
      console.error("❌ 기존 데이터 조회 실패:", error.message);
      return {
        urlSet: new Set(),
        titleMap: new Map(),
        authorTitleMap: new Map(),
      };
    }

    const urlSet = new Set();
    const titleMap = new Map(); // 제목 기반 중복 체크
    const authorTitleMap = new Map(); // 작성자+제목 기반 중복 체크

    data.forEach((item) => {
      // URL 정규화 후 저장
      const normalizedUrl = normalizeUrl(item.external_url);
      urlSet.add(normalizedUrl);

      // 제목 정규화 후 저장
      const normalizedTitle = normalizeTitle(item.title);
      if (normalizedTitle) {
        titleMap.set(normalizedTitle, item);

        // 작성자+제목 조합
        const authorTitle = `${item.author}:${normalizedTitle}`;
        authorTitleMap.set(authorTitle, item);
      }
    });

    return { urlSet, titleMap, authorTitleMap };
  } catch (error) {
    console.error("❌ 기존 데이터 조회 중 오류:", error.message);
    return {
      urlSet: new Set(),
      titleMap: new Map(),
      authorTitleMap: new Map(),
    };
  }
}

// RSS 피드 파싱
async function parseFeed(feedConfig) {
  try {
    console.log(`📡 ${feedConfig.name} 피드 파싱 중...`);

    const feed = await parser.parseURL(feedConfig.url);
    const articles = [];

    for (const item of feed.items) {
      if (!item.link) continue;

      // URL 정규화
      const normalizedUrl = normalizeUrl(item.link);

      // 발행일 처리
      const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

      const article = {
        title: (item.title || "제목 없음").trim(),
        summary: createSummary(
          item.contentSnippet || item.content || item.summary
        ),
        author: feedConfig.name,
        external_url: normalizedUrl, // 정규화된 URL 사용
        published_at: pubDate.toISOString(),
        thumbnail_url: extractThumbnail(item),
        blog_type: feedConfig.type,
      };

      articles.push(article);
    }
    console.log(`✅ ${feedConfig.name}: ${articles.length}개 글 파싱 완료`);
    return articles;
  } catch (error) {
    console.error(`❌ ${feedConfig.name} 피드 파싱 실패:`, error.message);
    return [];
  }
}

// 중복 검사 함수 (강화된 버전)
function isDuplicate(article, existingData) {
  const { urlSet, titleMap, authorTitleMap } = existingData;

  // 1. URL 기반 중복 체크
  if (urlSet.has(article.external_url)) {
    return { isDuplicate: true, reason: "URL 중복", url: article.external_url };
  }

  // 2. 작성자+제목 기반 중복 체크 (더 엄격)
  const normalizedTitle = normalizeTitle(article.title);
  const authorTitle = `${article.author}:${normalizedTitle}`;

  if (authorTitleMap.has(authorTitle)) {
    const existing = authorTitleMap.get(authorTitle);
    return {
      isDuplicate: true,
      reason: "작성자+제목 중복",
      title: article.title,
      existingUrl: existing.external_url,
    };
  }

  // 3. 제목만으로 중복 체크 (같은 제목이지만 다른 작성자는 허용)
  if (titleMap.has(normalizedTitle)) {
    const existing = titleMap.get(normalizedTitle);
    // 같은 작성자인 경우에만 중복으로 간주
    if (existing.author === article.author) {
      return {
        isDuplicate: true,
        reason: "제목 중복 (같은 작성자)",
        title: article.title,
      };
    }
  }

  return { isDuplicate: false };
}

// Supabase에 데이터 삽입 (강화된 중복 체크)
async function insertArticles(articles, existingData, feedName) {
  if (articles.length === 0) {
    console.log(`📝 [${feedName}] 삽입할 새로운 글이 없습니다.`);
    return { inserted: 0, duplicates: 0, duplicateReasons: [] };
  }

  const newArticles = [];
  const duplicateReasons = [];
  let duplicateCount = 0;

  // 강화된 중복 체크
  for (const article of articles) {
    const duplicateCheck = isDuplicate(article, existingData);

    if (duplicateCheck.isDuplicate) {
      duplicateCount++;
      duplicateReasons.push({
        title: article.title,
        reason: duplicateCheck.reason,
        url: duplicateCheck.url || duplicateCheck.existingUrl,
      });
    } else {
      newArticles.push(article);

      // 메모리상 existingData 업데이트 (같은 크롤링 세션 내 중복 방지)
      existingData.urlSet.add(article.external_url);
      const normalizedTitle = normalizeTitle(article.title);
      if (normalizedTitle) {
        existingData.titleMap.set(normalizedTitle, article);
        const authorTitle = `${article.author}:${normalizedTitle}`;
        existingData.authorTitleMap.set(authorTitle, article);
      }
    }
  }

  if (newArticles.length === 0) {
    console.log(
      `📝 [${feedName}] 모든 글이 중복입니다. (${duplicateCount}개 중복 제거됨)`
    );
    return { inserted: 0, duplicates: duplicateCount, duplicateReasons };
  }

  try {
    const { data, error } = await supabase
      .from("blogs")
      .insert(newArticles)
      .select();

    if (error) {
      console.error(`❌ [${feedName}] 데이터 삽입 실패:`, error.message);
      return { inserted: 0, duplicates: duplicateCount, duplicateReasons };
    }

    console.log(
      `✅ [${feedName}] ${newArticles.length}개 새 글 저장 (${duplicateCount}개 중복 제거)`
    );

    return {
      inserted: newArticles.length,
      duplicates: duplicateCount,
      duplicateReasons: duplicateReasons.slice(0, 3), // 첫 3개만 로그
    };
  } catch (error) {
    console.error(`❌ [${feedName}] 데이터 삽입 중 오류:`, error.message);
    return { inserted: 0, duplicates: duplicateCount, duplicateReasons };
  }
}

// 메인 실행 함수
async function main() {
  console.log("🚀 RSS 크롤링 시작...");
  console.log(`📊 총 ${RSS_FEEDS.length}개의 피드를 처리합니다.`);

  try {
    // 기존 데이터 가져오기 (강화된 중복 체크용)
    console.log("📋 기존 데이터 확인 중...");
    const existingData = await getExistingData();
    console.log(`📊 기존 글 수: ${existingData.urlSet.size}개`);

    let totalNewArticles = 0;
    let totalProcessed = 0;
    let totalDuplicates = 0;

    // 각 RSS 피드 처리
    for (const feedConfig of RSS_FEEDS) {
      const articles = await parseFeed(feedConfig);
      const result = await insertArticles(
        articles,
        existingData,
        feedConfig.name
      );

      totalNewArticles += result.inserted;
      totalDuplicates += result.duplicates;
      totalProcessed += articles.length;

      // 중복 상세 로그 (처음 몇 개만)
      if (result.duplicateReasons.length > 0) {
        console.log(`🔄 [${feedConfig.name}] 중복 예시:`);
        result.duplicateReasons.forEach((dup) => {
          console.log(`   - ${dup.reason}: "${dup.title.slice(0, 50)}..."`);
        });
      }

      // 피드 간 간격 (API 부하 방지)
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("\n🎉 RSS 크롤링 완료!");
    console.log(`📊 총 처리된 글: ${totalProcessed}개`);
    console.log(`✨ 새로 저장된 글: ${totalNewArticles}개`);
    console.log(`🔄 중복 제거된 글: ${totalDuplicates}개`);
    console.log(
      `📈 중복 제거율: ${((totalDuplicates / totalProcessed) * 100).toFixed(
        1
      )}%`
    );
  } catch (error) {
    console.error("❌ 크롤링 중 치명적 오류:", error.message);
    process.exit(1);
  }
}

// 스크립트 실행
main();
