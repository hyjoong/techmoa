import dotenv from "dotenv";
dotenv.config();
import { createClient } from "@supabase/supabase-js";
import Parser from "rss-parser";
import {
  processNewArticleNotification,
  sendBatchNotifications,
} from "./push-notification.js";
import { generateTagsForArticle, baseTagsFromFeedCategory } from "./ai-tags.js";
import { sendDiscordNotification } from "./discord-webhook.js";
import { RSS_FEEDS } from "./rss/feeds.js";
import { createSummary } from "./rss/summary.js";
import { extractThumbnail } from "./rss/thumbnail.js";
import { normalizeUrl, isDuplicate } from "./rss/dedup.js";

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

// 기존 데이터 확인 (모든 데이터 페이징으로 로드)
async function getExistingData() {
  try {
    const urlSet = new Set();
    const authorTitleMap = new Map(); // 작성자+제목 기반 중복 체크

    let allData = [];
    let hasMore = true;
    let offset = 0;
    const pageSize = 1000;

    console.log("📋 전체 데이터 로딩 중...");

    while (hasMore) {
      const { data, error } = await supabase
        .from("blogs")
        .select("external_url, title, author, published_at")
        .range(offset, offset + pageSize - 1)
        .order("id", { ascending: true });

      if (error) {
        console.error("❌ 기존 데이터 조회 실패:", error.message);
        break;
      }

      if (data && data.length > 0) {
        allData = allData.concat(data);
        console.log(`   로드된 글: ${allData.length}개`);

        // 마지막 페이지인지 확인
        hasMore = data.length === pageSize;
        offset += pageSize;
      } else {
        hasMore = false;
      }
    }

    console.log(`✅ 전체 ${allData.length}개 글 로드 완료`);

    allData.forEach((item) => {
      // URL 정규화 후 저장 (기존 데이터도 정규화해서 비교)
      const normalizedUrl = normalizeUrl(item.external_url);
      urlSet.add(normalizedUrl);

      // 원본 제목으로 작성자+제목 조합 저장 (DB 제약조건과 일치)
      if (item.title) {
        const authorTitle = `${item.author}:${item.title}`;
        authorTitleMap.set(authorTitle, item);
      }
    });

    return { urlSet, authorTitleMap };
  } catch (error) {
    console.error("❌ 기존 데이터 조회 중 오류:", error.message);
    return {
      urlSet: new Set(),
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
          item.contentSnippet || item.content || item.summary,
          feedConfig, // feedConfig 전달
          item // item 전달
        ),
        author: feedConfig.name,
        external_url: normalizedUrl, // 정규화된 URL 사용
        published_at: pubDate.toISOString(),
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

// Supabase에 데이터 삽입
async function insertArticles(articles, existingData, feedName) {
  if (articles.length === 0) {
    console.log(`📝 [${feedName}] 삽입할 새로운 글이 없습니다.`);
    return { inserted: 0, duplicates: 0, duplicateReasons: [] };
  }

  const newArticles = [];
  const duplicateReasons = [];
  let duplicateCount = 0;

  // 중복 체크
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
      // 태그가 비어있을 때만 AI 태깅 실행 (기본 카테고리 태그가 있으면 건너뜀)
      let mergedTags = article.tags || [];
      if (!mergedTags || mergedTags.length === 0) {
        const aiTags = await generateTagsForArticle(article);
        mergedTags = mergeTags(article.tags, aiTags);
        if (TAG_REQUEST_DELAY_MS > 0) {
          await sleep(TAG_REQUEST_DELAY_MS);
        }
      }

      newArticles.push({ ...article, tags: mergedTags });

      // 메모리상 existingData 업데이트 (같은 크롤링 세션 내 중복 방지)
      existingData.urlSet.add(article.external_url);
      if (article.title) {
        const authorTitle = `${article.author}:${article.title}`;
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

    // 🔔 푸시 알림: 각 새 글에 대해 알림 처리
    if (data && data.length > 0) {
      for (const article of data) {
        await processNewArticleNotification(article);
      }
    }

    return {
      inserted: newArticles.length,
      duplicates: duplicateCount,
      duplicateReasons: duplicateReasons.slice(0, 3), // 첫 3개만 로그
      newArticles: data || [], // 알림을 위해 새 글 반환
    };
  } catch (error) {
    console.error(`❌ [${feedName}] 데이터 삽입 중 오류:`, error.message);
    return { inserted: 0, duplicates: duplicateCount, duplicateReasons };
  }
}

// 메인 실행 함수
async function main() {
  console.log(`📊 총 ${RSS_FEEDS.length}개의 피드를 처리합니다.`);

  try {
    // 기존 데이터 가져오기
    console.log("📋 기존 데이터 확인 중...");
    const existingData = await getExistingData();
    console.log(`📊 기존 글 수: ${existingData.urlSet.size}개`);

    let totalNewArticles = 0;
    let totalProcessed = 0;
    let totalDuplicates = 0;
    const allNewArticles = []; // 🔔 모든 새 글을 모아서 일일 요약 알림에 사용

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

      // 🔔 새 글 수집 (일일 요약용)
      if (result.newArticles && result.newArticles.length > 0) {
        allNewArticles.push(...result.newArticles);
      }

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

    // 🔔 일일 요약 알림 전송
    if (allNewArticles.length > 0) {
      console.log("\n📱 푸시 알림 처리 중...");
      await sendBatchNotifications(allNewArticles);

      // 🔔 Discord 웹훅 알림
      await sendDiscordNotification(allNewArticles);
    }
  } catch (error) {
    console.error("❌ 크롤링 중 치명적 오류:", error.message);
    process.exit(1);
  }
}

// 스크립트로 직접 실행될 때만 크롤링 시작 (import 시 자동 실행 방지)
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
