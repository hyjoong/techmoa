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
  // 기존 기업 블로그
  { name: "토스 블로그", url: "https://toss.tech/rss.xml", type: "company" },
  {
    name: "무신사 블로그",
    url: "https://medium.com/feed/musinsa-tech",
    type: "company",
  },
  {
    name: "마켓 컬리 블로그",
    url: "https://helloworld.kurly.com/feed.xml",
    type: "company",
  },
  {
    name: "우아한 형제들 블로그",
    url: "https://techblog.woowahan.com/feed/",
    type: "company",
  },
  {
    name: "데브시스터즈 블로그",
    url: "https://tech.devsisters.com/rss.xml",
    type: "company",
  },
  {
    name: "당근 블로그",
    url: "https://medium.com/feed/daangn",
    type: "company",
  },
  {
    name: "쏘카 블로그",
    url: "https://tech.socarcorp.kr/feed",
    type: "company",
  },
  {
    name: "뱅크샐러드 블로그",
    url: "https://blog.banksalad.com/rss.xml",
    type: "company",
  },
  {
    name: "카카오 블로그",
    url: "https://tech.kakao.com/feed/",
    type: "company",
  },
  {
    name: "카카오페이 기술 블로그",
    url: "https://tech.kakaopay.com/rss",
    type: "company",
  },

  // 새로 추가된 기업 블로그
  { name: "29CM", url: "https://medium.com/feed/29cm", type: "company" },
  {
    name: "에잇퍼센트",
    url: "https://8percent.github.io/feed.xml",
    type: "company",
  },
  {
    name: "올리브영 기술블로그",
    url: "https://oliveyoung.tech/rss.xml",
    type: "company",
  },
  {
    name: "다나와",
    url: "https://danawalab.github.io/feed.xml",
    type: "company",
  },
  {
    name: "데이블",
    url: "https://teamdable.github.io/techblog/feed.xml",
    type: "company",
  },
  {
    name: "스타일쉐어",
    url: "https://medium.com/feed/styleshare",
    type: "company",
  },
  { name: "왓챠", url: "https://medium.com/feed/watcha", type: "company" },
  {
    name: "요기요",
    url: "https://medium.com/feed/deliverytechkorea",
    type: "company",
  },
  {
    name: "우아한형제들",
    url: "https://woowabros.github.io/feed.xml",
    type: "company",
  },
  {
    name: "원티드",
    url: "https://medium.com/feed/wantedjobs",
    type: "company",
  },
  {
    name: "이스트소프트",
    url: "https://blog.est.ai/feed.xml",
    type: "company",
  },
  { name: "직방", url: "https://medium.com/feed/zigbang", type: "company" },
  {
    name: "쿠팡",
    url: "https://medium.com/feed/coupang-tech",
    type: "company",
  },
  {
    name: "클래스101",
    url: "https://medium.com/feed/class101",
    type: "company",
  },
  {
    name: "하이퍼커넥트",
    url: "https://hyperconnect.github.io/feed.xml",
    type: "company",
  },
  {
    name: "휴먼스케이프",
    url: "https://medium.com/feed/humanscape-tech",
    type: "company",
  },

  // 개인 블로그
  {
    name: "정현수님 블로그",
    url: "https://junghyeonsu.com/rss.xml",
    type: "personal",
  },
  {
    name: "문동욱님 블로그",
    url: "https://evan-moon.github.io/feed.xml",
    type: "personal",
  },
  {
    name: "테오님 블로그",
    url: "https://api.velog.io/rss/@teo",
    type: "personal",
  },
  {
    name: "손수림님 블로그",
    url: "https://api.velog.io/rss/@surim014",
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
    "User-Agent": "Mozilla/5.0 (compatible; RSS-Crawler/1.0)",
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

  // 4. content에서 첫 번째 img 태그 추출
  const content = item.content || item["content:encoded"] || item.summary || "";
  const imgMatch = content.match(/<img[^>]+src="([^"]+)"/i);
  if (imgMatch && imgMatch[1]) {
    // 상대 URL인 경우 절대 URL로 변환
    const imgUrl = imgMatch[1];
    if (imgUrl.startsWith("http")) {
      return imgUrl;
    }
    // RSS 피드 URL에서 도메인 추출하여 상대 URL을 절대 URL로 변환
    try {
      const feedUrl = new URL(item.link || "");
      return new URL(imgUrl, feedUrl.origin).href;
    } catch (error) {
      return null;
    }
  }

  return null;
}

// 기존 URL 확인
async function getExistingUrls() {
  try {
    const { data, error } = await supabase.from("blogs").select("external_url");

    if (error) {
      console.error("❌ 기존 URL 조회 실패:", error.message);
      return new Set();
    }

    return new Set(data.map((item) => item.external_url));
  } catch (error) {
    console.error("❌ 기존 URL 조회 중 오류:", error.message);
    return new Set();
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

      const article = {
        title: item.title || "제목 없음",
        summary: createSummary(
          item.contentSnippet || item.content || item.summary
        ),
        author: feedConfig.name,
        external_url: item.link,
        published_at: item.pubDate
          ? new Date(item.pubDate).toISOString()
          : new Date().toISOString(),
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

// Supabase에 데이터 삽입
async function insertArticles(articles, existingUrls) {
  if (articles.length === 0) {
    console.log("📝 삽입할 새로운 글이 없습니다.");
    return 0;
  }

  // 중복 URL 필터링
  const newArticles = articles.filter(
    (article) => !existingUrls.has(article.external_url)
  );

  if (newArticles.length === 0) {
    console.log("📝 모든 글이 이미 존재합니다. (중복 제거됨)");
    return 0;
  }

  try {
    const { data, error } = await supabase
      .from("blogs")
      .insert(newArticles)
      .select();

    if (error) {
      console.error("❌ 데이터 삽입 실패:", error.message);
      return 0;
    }

    console.log(
      `✅ ${newArticles.length}개의 새로운 글이 성공적으로 저장되었습니다.`
    );
    return newArticles.length;
  } catch (error) {
    console.error("❌ 데이터 삽입 중 오류:", error.message);
    return 0;
  }
}

// 메인 실행 함수
async function main() {
  console.log("🚀 RSS 크롤링 시작...");
  console.log(`📊 총 ${RSS_FEEDS.length}개의 피드를 처리합니다.`);

  try {
    // 기존 URL 목록 가져오기
    console.log("📋 기존 데이터 확인 중...");
    const existingUrls = await getExistingUrls();
    console.log(`📊 기존 글 수: ${existingUrls.size}개`);

    let totalNewArticles = 0;
    let totalProcessed = 0;

    // 각 RSS 피드 처리
    for (const feedConfig of RSS_FEEDS) {
      const articles = await parseFeed(feedConfig);
      const insertedCount = await insertArticles(articles, existingUrls);

      totalNewArticles += insertedCount;
      totalProcessed += articles.length;

      // 새로 삽입된 URL들을 기존 URL 세트에 추가
      articles.forEach((article) => {
        if (!existingUrls.has(article.external_url)) {
          existingUrls.add(article.external_url);
        }
      });

      // 피드 간 간격 (API 부하 방지)
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("\n🎉 RSS 크롤링 완료!");
    console.log(`📊 총 처리된 글: ${totalProcessed}개`);
    console.log(`✨ 새로 저장된 글: ${totalNewArticles}개`);
    console.log(`🔄 중복 제거된 글: ${totalProcessed - totalNewArticles}개`);
  } catch (error) {
    console.error("❌ 크롤링 중 치명적 오류:", error.message);
    process.exit(1);
  }
}

// 스크립트 실행
main();
