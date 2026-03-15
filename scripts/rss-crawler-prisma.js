import dotenv from "dotenv";
dotenv.config();
import { PrismaClient } from "@prisma/client";
import Parser from "rss-parser";
import {
  processNewArticleNotification,
  sendBatchNotifications,
} from "./push-notification.js";
import { generateTagsForArticle, baseTagsFromFeedCategory } from "./ai-tags.js";

const prisma = new PrismaClient();
const parser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/xml,application/atom+xml,text/xml",
  },
});
const TAG_REQUEST_DELAY_MS = parseInt(
  process.env.TAG_REQUEST_DELAY_MS || "8000",
  10
);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const mergeTags = (tagsA = [], tagsB = []) => {
  const normalized = [...tagsA, ...tagsB]
    .filter(Boolean)
    .map((tag) => tag.toString().toLowerCase().trim())
    .filter((tag) => tag.length > 0);
  return Array.from(new Set(normalized)).slice(0, 8);
};

// RSS 피드 목록 (기존과 동일 - 생략하지 않고 전체 포함)
const RSS_FEEDS = [
  { name: "토스", url: "https://toss.tech/rss.xml", type: "company" },
  { name: "당근", url: "https://medium.com/feed/daangn", type: "company" },
  { name: "카카오", url: "https://tech.kakao.com/feed/", type: "company" },
  { name: "카카오페이", url: "https://tech.kakaopay.com/rss", type: "company" },
  { name: "무신사", url: "https://medium.com/feed/musinsa-tech", type: "company" },
  { name: "29CM", url: "https://medium.com/feed/29cm", type: "company" },
  { name: "올리브영", url: "https://oliveyoung.tech/rss.xml", type: "company" },
  { name: "우아한형제들", url: "https://techblog.woowahan.com/feed/", type: "company" },
  { name: "네이버", url: "https://d2.naver.com/d2.atom", type: "company" },
  { name: "라인", url: "https://techblog.lycorp.co.jp/ko/feed/index.xml", type: "company" },
  { name: "마켓컬리", url: "https://helloworld.kurly.com/feed.xml", type: "company" },
  { name: "에잇퍼센트", url: "https://8percent.github.io/feed.xml", type: "company" },
  { name: "쏘카", url: "https://tech.socarcorp.kr/feed", type: "company" },
  { name: "하이퍼커넥트", url: "https://hyperconnect.github.io/feed.xml", type: "company" },
  { name: "데브시스터즈", url: "https://tech.devsisters.com/rss.xml", type: "company" },
  { name: "뱅크샐러드", url: "https://blog.banksalad.com/rss.xml", type: "company" },
  { name: "왓챠", url: "https://medium.com/feed/watcha", type: "company" },
  { name: "다나와", url: "https://danawalab.github.io/feed.xml", type: "company" },
  { name: "레브잇", url: "https://medium.com/feed/%EB%A0%88%EB%B8%8C%EC%9E%87-%ED%85%8C%ED%81%AC%EB%B8%94%EB%A1%9C%EA%B7%B8", type: "company" },
  { name: "요기요", url: "https://medium.com/feed/deliverytechkorea", type: "company" },
  { name: "쿠팡", url: "https://medium.com/feed/coupang-tech", type: "company" },
  { name: "원티드", url: "https://medium.com/feed/wantedjobs", type: "company" },
  { name: "데이블", url: "https://teamdable.github.io/techblog/feed.xml", type: "company" },
  { name: "사람인", url: "https://saramin.github.io/feed.xml", type: "company" },
  { name: "직방", url: "https://medium.com/feed/zigbang", type: "company" },
  { name: "콴다", url: "https://medium.com/feed/mathpresso/tagged/frontend", type: "company" },
  { name: "AB180", url: "https://raw.githubusercontent.com/ab180/engineering-blog-rss-scheduler/main/rss.xml", type: "company" },
  // 개인 블로그
  { name: "문동욱", url: "https://evan-moon.github.io/feed.xml", type: "personal", category: "FE" },
  { name: "손수림", url: "https://api.velog.io/rss/@surim014", type: "personal", category: "FE" },
  { name: "스벨트전도사", url: "https://api.velog.io/rss/@k-svelte-master", type: "personal", category: "FE" },
  { name: "우혁", url: "https://api.velog.io/rss/@woogur29", type: "personal", category: "FE" },
  { name: "정현수", url: "https://junghyeonsu.com/rss.xml", type: "personal", category: "FE" },
  { name: "테오", url: "https://api.velog.io/rss/@teo", type: "personal", category: "FE" },
  { name: "황준일", url: "https://junilhwang.github.io/TIL/rss.xml", type: "personal", category: "FE" },
  { name: "향로", url: "https://jojoldu.tistory.com/rss", type: "personal", category: "BE" },
  { name: "망나니개발자", url: "https://mangkyu.tistory.com/rss", type: "personal", category: "BE" },
  { name: "멍개", url: "https://rss.blog.naver.com/pjt3591oo.xml", type: "personal", category: "AI" },
  { name: "심야", url: "https://api.velog.io/rss/@ximya_hf", type: "personal", category: "APP" },
];

// ===== 유틸리티 함수들 (기존과 동일) =====

function stripHtml(html) {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}

async function fetchThumbnailFromWeb(url, blogName = "웹") {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      timeout: 10000,
    });
    if (!response.ok) return null;
    const html = await response.text();
    const ogImageMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"[^>]*>/i);
    if (ogImageMatch && ogImageMatch[1]) return ogImageMatch[1];
    const twitterImageMatch = html.match(/<meta[^>]+name="twitter:image"[^>]+content="([^"]+)"[^>]*>/i);
    if (twitterImageMatch && twitterImageMatch[1]) return twitterImageMatch[1];
    return null;
  } catch (error) {
    console.log(`❌ [${blogName} 썸네일] 웹 접속 실패: ${error.message}`);
    return null;
  }
}

function createMediumSummary(item) {
  const contentSources = [item.contentSnippet, item["content:encoded"], item.content, item.summary, item.description];
  for (const content of contentSources) {
    if (!content) continue;
    let cleanedContent = stripHtml(content);
    if (content === item["content:encoded"] || content === item.content) {
      const paragraphMatch = content.match(/<p[^>]*>(.*?)<\/p>/i);
      if (paragraphMatch && paragraphMatch[1]) cleanedContent = stripHtml(paragraphMatch[1]);
      const subtitleMatch = content.match(/<h3[^>]*class="[^"]*subtitle[^"]*"[^>]*>(.*?)<\/h3>/i);
      if (subtitleMatch && subtitleMatch[1]) cleanedContent = stripHtml(subtitleMatch[1]);
    }
    if (cleanedContent && cleanedContent.trim().length > 10) {
      return cleanedContent.length > 200 ? cleanedContent.substring(0, 200) + "..." : cleanedContent;
    }
  }
  return "";
}

function createSummary(content, feedConfig = null, item = null) {
  if (feedConfig && feedConfig.url.includes("medium.com")) return createMediumSummary(item);
  if (!content) return "";
  const cleaned = stripHtml(content);
  return cleaned.length > 200 ? cleaned.substring(0, 200) + "..." : cleaned;
}

async function extractThumbnail(item, feedConfig = null) {
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
      const webThumbnail = await fetchThumbnailFromWeb(item.link, blog.name);
      if (webThumbnail) return webThumbnail;
      break;
    }
  }

  if (item.enclosure?.url && item.enclosure.type?.startsWith("image/")) return item.enclosure.url;
  if (item["media:content"]?.$?.url) return item["media:content"].$.url;
  if (item["media:thumbnail"]?.$?.url) return item["media:thumbnail"].$.url;

  const content = item.content || item["content:encoded"] || item.summary || "";
  const imgMatch = content.match(/<img[^>]+src="([^"]+)"[^>]*>/i);
  if (imgMatch && imgMatch[1] && !imgMatch[1].startsWith("data:") && imgMatch[1].startsWith("http")) {
    return imgMatch[1];
  }

  return null;
}

function normalizeUrl(url) {
  try {
    const urlObj = new URL(url);
    const paramsToRemove = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "gclid", "fromRss", "trackingCode", "source", "rss"];
    paramsToRemove.forEach((param) => urlObj.searchParams.delete(param));
    urlObj.hash = "";
    let cleanUrl = urlObj.toString();
    if (cleanUrl.endsWith("/") && cleanUrl !== urlObj.origin + "/") cleanUrl = cleanUrl.slice(0, -1);
    return cleanUrl;
  } catch (error) {
    return url;
  }
}

// ===== Prisma 기반 데이터 함수들 =====

async function getExistingData() {
  try {
    const urlSet = new Set();
    const authorTitleMap = new Map();

    console.log("📋 전체 데이터 로딩 중...");

    const allData = await prisma.blog.findMany({
      select: { external_url: true, title: true, author: true, published_at: true },
      orderBy: { id: "asc" },
    });

    console.log(`✅ 전체 ${allData.length}개 글 로드 완료`);

    allData.forEach((item) => {
      const normalizedUrl = normalizeUrl(item.external_url);
      urlSet.add(normalizedUrl);
      if (item.title) {
        const authorTitle = `${item.author}:${item.title}`;
        authorTitleMap.set(authorTitle, item);
      }
    });

    return { urlSet, authorTitleMap };
  } catch (error) {
    console.error("❌ 기존 데이터 조회 중 오류:", error.message);
    return { urlSet: new Set(), authorTitleMap: new Map() };
  }
}

async function parseFeed(feedConfig) {
  try {
    console.log(`📡 ${feedConfig.name} 피드 파싱 중...`);
    const feed = await parser.parseURL(feedConfig.url);
    const articles = [];

    for (const item of feed.items) {
      if (!item.link) continue;
      const normalizedUrl = normalizeUrl(item.link);
      const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

      const article = {
        title: (item.title || "제목 없음").trim(),
        summary: createSummary(item.contentSnippet || item.content || item.summary, feedConfig, item),
        author: feedConfig.name,
        external_url: normalizedUrl,
        published_at: pubDate,
        thumbnail_url: await extractThumbnail(item, feedConfig),
        blog_type: feedConfig.type,
        category: feedConfig.category || null,
        tags: baseTagsFromFeedCategory(feedConfig.category),
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

function isDuplicate(article, existingData) {
  const { urlSet, authorTitleMap } = existingData;
  if (urlSet.has(article.external_url)) {
    return { isDuplicate: true, reason: "URL 중복" };
  }
  const authorTitle = `${article.author}:${article.title}`;
  if (authorTitleMap.has(authorTitle)) {
    return { isDuplicate: true, reason: "작성자+제목 중복" };
  }
  return { isDuplicate: false };
}

async function insertArticles(articles, existingData, feedName) {
  if (articles.length === 0) {
    console.log(`📝 [${feedName}] 삽입할 새로운 글이 없습니다.`);
    return { inserted: 0, duplicates: 0, newArticles: [] };
  }

  const newArticles = [];
  let duplicateCount = 0;

  for (const article of articles) {
    const duplicateCheck = isDuplicate(article, existingData);
    if (duplicateCheck.isDuplicate) {
      duplicateCount++;
    } else {
      let mergedTags = article.tags || [];
      if (!mergedTags || mergedTags.length === 0) {
        const aiTags = await generateTagsForArticle(article);
        mergedTags = mergeTags(article.tags, aiTags);
        if (TAG_REQUEST_DELAY_MS > 0) await sleep(TAG_REQUEST_DELAY_MS);
      }
      newArticles.push({ ...article, tags: mergedTags });
      existingData.urlSet.add(article.external_url);
      if (article.title) {
        existingData.authorTitleMap.set(`${article.author}:${article.title}`, article);
      }
    }
  }

  if (newArticles.length === 0) {
    console.log(`📝 [${feedName}] 모든 글이 중복입니다. (${duplicateCount}개)`);
    return { inserted: 0, duplicates: duplicateCount, newArticles: [] };
  }

  try {
    // Prisma createMany doesn't return created records, so use individual creates
    const createdArticles = [];
    for (const article of newArticles) {
      const created = await prisma.blog.create({
        data: {
          title: article.title,
          summary: article.summary || null,
          author: article.author,
          tags: article.tags || [],
          published_at: article.published_at,
          thumbnail_url: article.thumbnail_url || null,
          external_url: article.external_url,
          blog_type: article.blog_type,
          category: article.category,
          views: 0,
        },
      });
      createdArticles.push(created);
      await processNewArticleNotification(created);
    }

    console.log(`✅ [${feedName}] ${newArticles.length}개 새 글 저장 (${duplicateCount}개 중복 제거)`);
    return { inserted: newArticles.length, duplicates: duplicateCount, newArticles: createdArticles };
  } catch (error) {
    console.error(`❌ [${feedName}] 데이터 삽입 실패:`, error.message);
    return { inserted: 0, duplicates: duplicateCount, newArticles: [] };
  }
}

async function main() {
  console.log(`📊 총 ${RSS_FEEDS.length}개의 피드를 처리합니다.`);

  try {
    console.log("📋 기존 데이터 확인 중...");
    const existingData = await getExistingData();
    console.log(`📊 기존 글 수: ${existingData.urlSet.size}개`);

    let totalNewArticles = 0;
    let totalProcessed = 0;
    let totalDuplicates = 0;
    const allNewArticles = [];

    for (const feedConfig of RSS_FEEDS) {
      const articles = await parseFeed(feedConfig);
      const result = await insertArticles(articles, existingData, feedConfig.name);
      totalNewArticles += result.inserted;
      totalDuplicates += result.duplicates;
      totalProcessed += articles.length;
      if (result.newArticles.length > 0) allNewArticles.push(...result.newArticles);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log("\n🎉 RSS 크롤링 완료!");
    console.log(`📊 총 처리된 글: ${totalProcessed}개`);
    console.log(`✨ 새로 저장된 글: ${totalNewArticles}개`);
    console.log(`🔄 중복 제거된 글: ${totalDuplicates}개`);

    if (allNewArticles.length > 0) {
      console.log("\n📱 푸시 알림 처리 중...");
      await sendBatchNotifications(allNewArticles);
    }
  } catch (error) {
    console.error("❌ 크롤링 중 치명적 오류:", error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
