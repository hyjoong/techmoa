import Parser from "rss-parser";
import {
  generateTagsForArticle,
  baseTagsFromFeedCategory,
} from "../../scripts/ai-tags.js";
import { sendDiscordNotification } from "../../scripts/discord-webhook.js";
import {
  processNewArticleNotification,
  sendBatchNotifications,
} from "../../scripts/push-notification.js";
import { RSS_FEEDS } from "../../scripts/rss/feeds.js";
import { createSummary } from "../../scripts/rss/summary.js";
import { extractThumbnail } from "../../scripts/rss/thumbnail.js";
import { normalizeUrl, isDuplicate } from "../../scripts/rss/dedup.js";
import { createSupabaseAdminClient } from "./supabase-admin.js";

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

const FEED_DELAY_MS = parseInt(process.env.RSS_FEED_DELAY_MS || "1000", 10);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const mergeTags = (tagsA = [], tagsB = []) => {
  const normalized = [...tagsA, ...tagsB]
    .filter(Boolean)
    .map((tag) => tag.toString().toLowerCase().trim())
    .filter((tag) => tag.length > 0);

  return Array.from(new Set(normalized)).slice(0, 8);
};

export async function getExistingArticleIndex(supabase) {
  const urlSet = new Set();
  const authorTitleMap = new Map();
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
      throw new Error(`기존 데이터 조회 실패: ${error.message}`);
    }

    if (data && data.length > 0) {
      allData = allData.concat(data);
      console.log(`   로드된 글: ${allData.length}개`);
      hasMore = data.length === pageSize;
      offset += pageSize;
    } else {
      hasMore = false;
    }
  }

  allData.forEach((item) => {
    urlSet.add(normalizeUrl(item.external_url));

    if (item.title) {
      authorTitleMap.set(`${item.author}:${item.title}`, item);
    }
  });

  console.log(`✅ 전체 ${allData.length}개 글 로드 완료`);
  return { urlSet, authorTitleMap };
}

export async function parseFeed(feedConfig) {
  console.log(`📡 ${feedConfig.name} 피드 파싱 중...`);

  try {
    const feed = await parser.parseURL(feedConfig.url);
    const articles = [];

    for (const item of feed.items) {
      if (!item.link) continue;

      const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();

      articles.push({
        title: (item.title || "제목 없음").trim(),
        summary: createSummary(
          item.contentSnippet || item.content || item.summary,
          feedConfig,
          item
        ),
        author: feedConfig.name,
        external_url: normalizeUrl(item.link),
        published_at: publishedAt.toISOString(),
        thumbnail_url: await extractThumbnail(item, feedConfig),
        blog_type: feedConfig.type,
        category: feedConfig.category || null,
        tags: baseTagsFromFeedCategory(feedConfig.category),
      });
    }

    console.log(`✅ ${feedConfig.name}: ${articles.length}개 글 파싱 완료`);
    return articles;
  } catch (error) {
    console.error(`❌ ${feedConfig.name} 피드 파싱 실패:`, error.message);
    return [];
  }
}

export async function insertNewArticles(
  supabase,
  articles,
  existingData,
  feedName
) {
  if (articles.length === 0) {
    console.log(`📝 [${feedName}] 삽입할 새로운 글이 없습니다.`);
    return {
      inserted: 0,
      duplicates: 0,
      duplicateReasons: [],
      newArticles: [],
    };
  }

  const newArticles = [];
  const duplicateReasons = [];
  let duplicateCount = 0;

  for (const article of articles) {
    const duplicateCheck = isDuplicate(article, existingData);

    if (duplicateCheck.isDuplicate) {
      duplicateCount++;
      duplicateReasons.push({
        title: article.title,
        reason: duplicateCheck.reason,
        url: duplicateCheck.url || duplicateCheck.existingUrl,
      });
      continue;
    }

    let mergedTags = article.tags || [];
    if (!mergedTags || mergedTags.length === 0) {
      const aiTags = await generateTagsForArticle(article);
      mergedTags = mergeTags(article.tags, aiTags);

      if (TAG_REQUEST_DELAY_MS > 0) {
        await sleep(TAG_REQUEST_DELAY_MS);
      }
    }

    newArticles.push({ ...article, tags: mergedTags });
    existingData.urlSet.add(article.external_url);

    if (article.title) {
      existingData.authorTitleMap.set(
        `${article.author}:${article.title}`,
        article
      );
    }
  }

  if (newArticles.length === 0) {
    console.log(
      `📝 [${feedName}] 모든 글이 중복입니다. (${duplicateCount}개 중복 제거됨)`
    );
    return {
      inserted: 0,
      duplicates: duplicateCount,
      duplicateReasons,
      newArticles: [],
    };
  }

  const { data, error } = await supabase
    .from("blogs")
    .insert(newArticles)
    .select();

  if (error) {
    console.error(`❌ [${feedName}] 데이터 삽입 실패:`, error.message);
    return {
      inserted: 0,
      duplicates: duplicateCount,
      duplicateReasons,
      newArticles: [],
    };
  }

  console.log(
    `✅ [${feedName}] ${newArticles.length}개 새 글 저장 (${duplicateCount}개 중복 제거)`
  );

  if (data && data.length > 0) {
    for (const article of data) {
      await processNewArticleNotification(article);
    }
  }

  return {
    inserted: newArticles.length,
    duplicates: duplicateCount,
    duplicateReasons,
    newArticles: data || [],
  };
}

export async function runRssCrawl({
  feeds = RSS_FEEDS,
  supabase = createSupabaseAdminClient(),
  sendNotifications = true,
} = {}) {
  console.log(`📊 총 ${feeds.length}개의 피드를 처리합니다.`);

  const existingData = await getExistingArticleIndex(supabase);
  console.log(`📊 기존 글 수: ${existingData.urlSet.size}개`);

  let totalNewArticles = 0;
  let totalProcessed = 0;
  let totalDuplicates = 0;
  const allNewArticles = [];
  const feedResults = [];

  for (const feedConfig of feeds) {
    const articles = await parseFeed(feedConfig);
    const result = await insertNewArticles(
      supabase,
      articles,
      existingData,
      feedConfig.name
    );

    totalNewArticles += result.inserted;
    totalDuplicates += result.duplicates;
    totalProcessed += articles.length;

    if (result.newArticles.length > 0) {
      allNewArticles.push(...result.newArticles);
    }

    if (result.duplicateReasons.length > 0) {
      console.log(`🔄 [${feedConfig.name}] 중복 예시:`);
      result.duplicateReasons.slice(0, 3).forEach((dup) => {
        console.log(`   - ${dup.reason}: "${dup.title.slice(0, 50)}..."`);
      });
    }

    feedResults.push({
      feed: feedConfig.name,
      processed: articles.length,
      inserted: result.inserted,
      duplicates: result.duplicates,
    });

    if (FEED_DELAY_MS > 0) {
      await sleep(FEED_DELAY_MS);
    }
  }

  const duplicateRate =
    totalProcessed === 0 ? 0 : (totalDuplicates / totalProcessed) * 100;

  console.log("\n🎉 RSS 크롤링 완료!");
  console.log(`📊 총 처리된 글: ${totalProcessed}개`);
  console.log(`✨ 새로 저장된 글: ${totalNewArticles}개`);
  console.log(`🔄 중복 제거된 글: ${totalDuplicates}개`);
  console.log(`📈 중복 제거율: ${duplicateRate.toFixed(1)}%`);

  if (sendNotifications && allNewArticles.length > 0) {
    console.log("\n📱 푸시 알림 처리 중...");
    await sendBatchNotifications(allNewArticles);
    await sendDiscordNotification(allNewArticles);
  }

  return {
    totalProcessed,
    totalNewArticles,
    totalDuplicates,
    duplicateRate,
    feedResults,
    newArticles: allNewArticles,
  };
}
