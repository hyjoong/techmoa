import Parser from "rss-parser";
import {
  classifyArticleTags,
  baseTagsFromFeedCategory,
  mergeAndDedupe,
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
import {
  getExclusionReason,
  isNonTechClassification,
} from "../../scripts/rss/filter.js";
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

const mergeTags = (tagsA = [], tagsB = []) =>
  mergeAndDedupe([...tagsA, ...tagsB]).slice(0, 8);

// 제외된 글을 기록해 다음 크롤링에서 중복으로 걸리게 한다.
// 기록이 없으면 피드에 남아있는 동안 매 크롤링마다 AI 재판정 비용이 발생한다.
// 테이블이 아직 없으면 경고만 남기고 크롤링은 계속한다.
let warnedExclusionTableMissing = false;
async function recordExclusion(supabase, article, reason) {
  const { error } = await supabase.from("excluded_articles").upsert(
    {
      external_url: article.external_url,
      author: article.author,
      title: article.title,
      reason,
    },
    { onConflict: "external_url", ignoreDuplicates: true }
  );

  if (error && !warnedExclusionTableMissing) {
    warnedExclusionTableMissing = true;
    console.warn(`⚠️ 제외 기록 저장 실패(크롤링은 계속): ${error.message}`);
  }
}

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

  // 과거에 수집 제외된 글도 중복으로 취급해 AI 재판정을 막는다.
  let excludedOffset = 0;
  let excludedTotal = 0;
  while (true) {
    const { data, error } = await supabase
      .from("excluded_articles")
      .select("external_url")
      .range(excludedOffset, excludedOffset + pageSize - 1)
      .order("id", { ascending: true });

    if (error) {
      console.warn(`⚠️ 제외 기록 조회 실패(무시): ${error.message}`);
      break;
    }
    if (!data || data.length === 0) break;

    data.forEach((row) => urlSet.add(normalizeUrl(row.external_url)));
    excludedTotal += data.length;
    if (data.length < pageSize) break;
    excludedOffset += pageSize;
  }
  if (excludedTotal > 0) {
    console.log(`🚫 제외 기록 ${excludedTotal}개 로드 완료`);
  }

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
  feedConfig
) {
  const feedName = feedConfig.name;
  if (articles.length === 0) {
    console.log(`📝 [${feedName}] 삽입할 새로운 글이 없습니다.`);
    return {
      inserted: 0,
      duplicates: 0,
      excluded: 0,
      duplicateReasons: [],
      newArticles: [],
    };
  }

  const newArticles = [];
  const duplicateReasons = [];
  let duplicateCount = 0;
  let excludedCount = 0;

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

    const exclusionReason = getExclusionReason(article);
    if (exclusionReason) {
      excludedCount++;
      console.log(
        `🚫 [${feedName}] 수집 제외 (${exclusionReason}): "${article.title}"`
      );
      await recordExclusion(supabase, article, exclusionReason);
      existingData.urlSet.add(article.external_url);
      continue;
    }

    const classification = await classifyArticleTags(article);
    if (classification.status === "ok" && TAG_REQUEST_DELAY_MS > 0) {
      await sleep(TAG_REQUEST_DELAY_MS);
    }

    if (isNonTechClassification(article, classification)) {
      excludedCount++;
      console.log(
        `🚫 [${feedName}] 수집 제외 (AI 비기술 판정): "${article.title}"`
      );
      await recordExclusion(supabase, article, "AI 비기술 판정");
      existingData.urlSet.add(article.external_url);
      continue;
    }

    const mergedTags = mergeTags(article.tags, classification.tags);

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
      `📝 [${feedName}] 새로 저장할 글이 없습니다. (중복 ${duplicateCount}개, 필터 제외 ${excludedCount}개)`
    );
    return {
      inserted: 0,
      duplicates: duplicateCount,
      excluded: excludedCount,
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
      excluded: excludedCount,
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
    excluded: excludedCount,
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
  let totalExcluded = 0;
  const allNewArticles = [];
  const feedResults = [];

  for (const feedConfig of feeds) {
    const articles = await parseFeed(feedConfig);
    const result = await insertNewArticles(
      supabase,
      articles,
      existingData,
      feedConfig
    );

    totalNewArticles += result.inserted;
    totalDuplicates += result.duplicates;
    totalExcluded += result.excluded;
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
      excluded: result.excluded,
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
  console.log(`🚫 필터로 제외된 글: ${totalExcluded}개`);
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
    totalExcluded,
    duplicateRate,
    feedResults,
    newArticles: allNewArticles,
  };
}
