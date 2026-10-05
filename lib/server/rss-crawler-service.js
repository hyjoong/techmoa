import Parser from "rss-parser";
import {
  classifyArticleTags,
  baseTagsFromFeedCategory,
  mergeAndDedupe,
} from "../../scripts/ai-tags.js";
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

const TAG_REQUEST_DELAY_MS = Math.max(
  8000,
  parseInt(process.env.TAG_REQUEST_DELAY_MS || "8000", 10) || 8000,
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
  let error;
  try {
    ({ error } = await supabase.from("excluded_articles").upsert(
      {
        external_url: article.external_url,
        author: article.author,
        title: article.title,
        reason,
      },
      { onConflict: "external_url", ignoreDuplicates: true },
    ));
  } catch (caught) {
    error = caught;
  }

  if (error && !warnedExclusionTableMissing) {
    warnedExclusionTableMissing = true;
    console.warn(`⚠️ 제외 기록 저장 실패(크롤링은 계속): ${error.message}`);
  }
  return error ? `제외 기록 저장 실패: ${error.message}` : null;
}

export async function getExistingArticleIndex(supabase, { onWarning } = {}) {
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
      offset += data.length;
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
      onWarning?.(`제외 기록 조회 실패: ${error.message}`);
      break;
    }
    if (!data || data.length === 0) break;

    data.forEach((row) => urlSet.add(normalizeUrl(row.external_url)));
    excludedTotal += data.length;
    excludedOffset += data.length;
  }
  if (excludedTotal > 0) {
    console.log(`🚫 제외 기록 ${excludedTotal}개 로드 완료`);
  }

  return { urlSet, authorTitleMap };
}

export async function parseFeed(
  feedConfig,
  { failOnError = false, dryRun = false, since = null, onSkippedByDate } = {},
) {
  console.log(`📡 ${feedConfig.name} 피드 파싱 중...`);

  try {
    const feed = await parser.parseURL(feedConfig.url);
    const articles = [];

    for (const item of feed.items) {
      if (!item.link) continue;

      const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();
      if (since !== null && publishedAt.getTime() < Date.parse(since)) {
        onSkippedByDate?.();
        continue;
      }

      articles.push({
        title: (item.title || "제목 없음").trim(),
        summary: createSummary(
          item.contentSnippet || item.content || item.summary,
          feedConfig,
          item,
        ),
        author: feedConfig.name,
        external_url: normalizeUrl(item.link),
        published_at: publishedAt.toISOString(),
        thumbnail_url: dryRun ? null : await extractThumbnail(item, feedConfig),
        blog_type: feedConfig.type,
        category: feedConfig.category || null,
        tags: baseTagsFromFeedCategory(feedConfig.category),
      });
    }

    console.log(`✅ ${feedConfig.name}: ${articles.length}개 글 파싱 완료`);
    return articles;
  } catch (error) {
    console.error(`❌ ${feedConfig.name} 피드 파싱 실패:`, error.message);
    if (failOnError) {
      throw Object.assign(
        new Error(`${feedConfig.name} 피드 파싱 실패: ${error.message}`),
        { stage: "parse" },
      );
    }
    return [];
  }
}

function crawlError(stage, message) {
  return Object.assign(new Error(message), { stage });
}

function validateLimits({ since, maxArticlesPerFeed, maxAiArticles }) {
  if (
    since !== null &&
    (typeof since !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
        since,
      ) ||
      !Number.isFinite(Date.parse(since)))
  ) {
    throw new Error("since는 시간대가 있는 ISO 타임스탬프여야 합니다.");
  }
  for (const [name, value] of Object.entries({
    maxArticlesPerFeed,
    maxAiArticles,
  })) {
    if (value !== null && (!Number.isSafeInteger(value) || value <= 0)) {
      throw new Error(`${name}는 양의 정수여야 합니다.`);
    }
  }
}

function addToIndex(index, article) {
  index.urlSet.add(article.external_url);
  if (article.title) {
    index.authorTitleMap.set(`${article.author}:${article.title}`, article);
  }
}

function emptyArticleResult() {
  return {
    inserted: 0,
    duplicates: 0,
    excluded: 0,
    candidates: 0,
    deferred: 0,
    skippedByDate: 0,
    aiArticles: 0,
    duplicateReasons: [],
    newArticles: [],
    errors: [],
    warnings: [],
  };
}

export async function insertNewArticles(
  supabase,
  articles,
  existingData,
  feedConfig,
  {
    sendNotifications = true,
    failOnError = false,
    dryRun = false,
    since = null,
    maxArticlesPerFeed = null,
    maxAiArticles = null,
    // 실행 전체 예산을 공유한다. HTTP 재시도가 아닌 글별 분류 시도 한도다.
    aiBudget = { used: 0 },
  } = {},
) {
  validateLimits({ since, maxArticlesPerFeed, maxAiArticles });
  const feedName = feedConfig.name;
  const result = emptyArticleResult();
  const stagedArticles = [];
  // 같은 피드 내 중복은 잡되, 저장 실패한 글로 다음 피드의 인덱스를 오염시키지 않는다.
  const workingIndex = {
    urlSet: new Set(existingData.urlSet),
    authorTitleMap: new Map(existingData.authorTitleMap),
  };
  const recordError = (stage, message) => {
    result.errors.push({ stage, message });
    console.error(`❌ ${message}`);
    if (failOnError) throw crawlError(stage, message);
  };
  const exclude = async (article, reason) => {
    result.excluded++;
    if (dryRun) {
      existingData.urlSet.add(article.external_url);
      return;
    }
    const warning = await recordExclusion(supabase, article, reason);
    if (warning) result.warnings.push(warning);
    else existingData.urlSet.add(article.external_url);
  };

  try {
    const sorted = [...articles].sort(
      (a, b) => Date.parse(b.published_at) - Date.parse(a.published_at),
    );
    for (const article of sorted) {
      if (
        since !== null &&
        Date.parse(article.published_at) < Date.parse(since)
      ) {
        result.skippedByDate++;
        continue;
      }
      const duplicateCheck = isDuplicate(article, workingIndex);
      if (duplicateCheck.isDuplicate) {
        result.duplicates++;
        result.duplicateReasons.push({
          title: article.title,
          reason: duplicateCheck.reason,
          url: duplicateCheck.url || duplicateCheck.existingUrl,
        });
        continue;
      }
      addToIndex(workingIndex, article);

      const exclusionReason = getExclusionReason(article);
      if (exclusionReason) {
        await exclude(article, exclusionReason);
        continue;
      }
      if (
        (maxArticlesPerFeed !== null &&
          result.candidates >= maxArticlesPerFeed) ||
        (maxAiArticles !== null && aiBudget.used >= maxAiArticles)
      ) {
        result.deferred++;
        continue;
      }

      result.candidates++;
      aiBudget.used++;
      if (dryRun) {
        // AI 판정 전 최대 저장 예상치이며, 실제 새 글이나 저장 건수로 세지 않는다.
        addToIndex(existingData, article);
        continue;
      }

      result.aiArticles++;
      let classification;
      let classificationErrorRecorded = false;
      try {
        classification = await classifyArticleTags(article);
      } catch (error) {
        recordError("ai", `[${feedName}] 태그 분류 실패: ${error.message}`);
        classificationErrorRecorded = true;
        classification = { status: "error", tags: [], nonTech: false };
      }
      if (
        !classificationErrorRecorded &&
        (classification.status === "error" ||
          classification.status === "unavailable")
      ) {
        const message = `[${feedName}] 태그 분류 실패 (${classification.status}): ${article.title}`;
        if (!result.errors.some((error) => error.message === message)) {
          recordError("ai", message);
        }
      }
      if (classification.status !== "unavailable") {
        await sleep(TAG_REQUEST_DELAY_MS);
      }
      if (isNonTechClassification(article, classification)) {
        await exclude(article, "AI 비기술 판정");
        continue;
      }
      stagedArticles.push({
        ...article,
        tags: mergeTags(article.tags, classification.tags),
      });
    }

    if (dryRun || stagedArticles.length === 0) return result;

    let response;
    try {
      response = await supabase.from("blogs").insert(stagedArticles).select();
    } catch (error) {
      recordError("insert", `[${feedName}] 데이터 삽입 실패: ${error.message}`);
      return result;
    }
    if (response.error) {
      recordError(
        "insert",
        `[${feedName}] 데이터 삽입 실패: ${response.error.message}`,
      );
      return result;
    }

    result.inserted = stagedArticles.length;
    result.newArticles = response.data || [];
    stagedArticles.forEach((article) => addToIndex(existingData, article));
    console.log(
      `✅ [${feedName}] ${result.inserted}개 새 글 저장 (${result.duplicates}개 중복 제거)`,
    );

    if (sendNotifications) {
      let processNewArticleNotification;
      try {
        ({ processNewArticleNotification } = await import(
          "../../scripts/push-notification.js"
        ));
      } catch (error) {
        recordError(
          "notification",
          `[${feedName}] 알림 초기화 실패: ${error.message}`,
        );
        return result;
      }
      for (const article of result.newArticles) {
        let notification;
        try {
          notification = await processNewArticleNotification(article);
        } catch (error) {
          recordError(
            "notification",
            `[${feedName}] 개별 알림 실패: ${error.message}`,
          );
          continue;
        }
        if (notification?.success === false) {
          recordError(
            "notification",
            `[${feedName}] 개별 알림 실패: ${notification.error || "알 수 없는 오류"}`,
          );
        }
      }
    }
    return result;
  } catch (error) {
    error.articleResult = result;
    throw error;
  }
}

export async function runRssCrawl({
  feeds = RSS_FEEDS,
  supabase,
  sendNotifications = true,
  failOnError = false,
  dryRun = false,
  since = null,
  maxArticlesPerFeed = null,
  maxAiArticles = null,
  onProgress,
} = {}) {
  validateLimits({ since, maxArticlesPerFeed, maxAiArticles });
  if (!Array.isArray(feeds)) throw new Error("feeds는 피드 배열이어야 합니다.");
  if (onProgress !== undefined && typeof onProgress !== "function") {
    throw new Error("onProgress는 함수여야 합니다.");
  }
  const startedAt = new Date().toISOString();
  const report = {
    schemaVersion: 1,
    status: "running",
    startedAt,
    finishedAt: null,
    durationMs: 0,
    dryRun,
    notificationsEnabled: !dryRun && sendNotifications,
    totalProcessed: 0,
    totalNewArticles: 0,
    totalDuplicates: 0,
    totalExcluded: 0,
    totalCandidates: 0,
    totalDeferred: 0,
    totalSkippedByDate: 0,
    totalAiArticles: 0,
    duplicateRate: 0,
    errors: [],
    warnings: [],
    feedResults: [],
    newArticles: [],
  };
  const snapshot = () => JSON.parse(JSON.stringify(report));
  const emitProgress = async () => {
    report.durationMs = Date.now() - Date.parse(startedAt);
    if (!onProgress) return;
    try {
      await onProgress(snapshot());
    } catch (error) {
      throw crawlError("progress", `수집 결과 기록 실패: ${error.message}`);
    }
  };
  const finish = () => {
    report.finishedAt = new Date().toISOString();
    report.durationMs = Date.parse(report.finishedAt) - Date.parse(startedAt);
    report.status =
      report.errors.length === 0
        ? "success"
        : report.totalNewArticles > 0 ||
            report.feedResults.some((feed) => feed.success)
          ? "partial_failure"
          : "failed";
  };
  let fatalError;
  try {
    await emitProgress();
    const client = supabase ?? createSupabaseAdminClient();
    let existingData;
    try {
      existingData = await getExistingArticleIndex(client, {
        onWarning: (warning) => report.warnings.push(warning),
      });
    } catch (error) {
      throw crawlError("existing_index", error.message);
    }
    const aiBudget = { used: 0 };
    console.log(`📊 총 ${feeds.length}개의 피드를 처리합니다.`);

    for (const feedConfig of feeds) {
      const feedStartedAt = new Date().toISOString();
      let processed = 0;
      let skippedByDate = 0;
      let result = emptyArticleResult();
      let feedError;
      try {
        // 공개 parseFeed 기본값은 보존하고, 실행기는 실패를 받아 보고한 뒤 계속한다.
        const articles = await parseFeed(feedConfig, {
          failOnError: true,
          dryRun,
          since,
          onSkippedByDate: () => {
            skippedByDate++;
          },
        });
        processed = articles.length + skippedByDate;
        result = await insertNewArticles(
          client,
          articles,
          existingData,
          feedConfig,
          {
            sendNotifications: report.notificationsEnabled,
            failOnError,
            dryRun,
            since,
            maxArticlesPerFeed,
            maxAiArticles,
            aiBudget,
          },
        );
      } catch (error) {
        feedError = error;
        result = error.articleResult || result;
        const detail = {
          stage: error.stage || "processing",
          message: error.message,
        };
        if (
          !result.errors.some(
            (entry) =>
              entry.stage === detail.stage && entry.message === detail.message,
          )
        ) {
          result.errors.push(detail);
        }
      }
      result.skippedByDate += skippedByDate;
      const finishedAt = new Date().toISOString();
      const feedResult = {
        feed: feedConfig.name,
        url: feedConfig.url,
        success: result.errors.length === 0,
        status: result.errors.length ? "failed" : "success",
        startedAt: feedStartedAt,
        finishedAt,
        durationMs: Date.parse(finishedAt) - Date.parse(feedStartedAt),
        processed,
        inserted: result.inserted,
        duplicates: result.duplicates,
        excluded: result.excluded,
        candidates: result.candidates,
        deferred: result.deferred,
        skippedByDate: result.skippedByDate,
        aiArticles: result.aiArticles,
        errors: result.errors,
        warnings: [...new Set(result.warnings)],
      };
      report.feedResults.push(feedResult);
      report.totalProcessed += processed;
      report.totalNewArticles += result.inserted;
      report.totalDuplicates += result.duplicates;
      report.totalExcluded += result.excluded;
      report.totalCandidates += result.candidates;
      report.totalDeferred += result.deferred;
      report.totalSkippedByDate += result.skippedByDate;
      report.totalAiArticles += result.aiArticles;
      report.newArticles.push(...result.newArticles);
      report.errors.push(
        ...result.errors.map((error) => ({ ...error, feed: feedConfig.name })),
      );
      report.warnings.push(
        ...feedResult.warnings.map(
          (warning) => `[${feedConfig.name}] ${warning}`,
        ),
      );
      report.duplicateRate =
        report.totalProcessed === 0
          ? 0
          : (report.totalDuplicates / report.totalProcessed) * 100;
      await emitProgress();
      if (feedError && failOnError) {
        feedError.feed = feedConfig.name;
        throw feedError;
      }
      if (FEED_DELAY_MS > 0) await sleep(FEED_DELAY_MS);
    }

    if (report.notificationsEnabled && report.newArticles.length > 0) {
      for (const [label, send] of [
        [
          "배치 푸시",
          async (articles) => {
            const { sendBatchNotifications } = await import(
              "../../scripts/push-notification.js"
            );
            return sendBatchNotifications(articles);
          },
        ],
        [
          "Discord",
          async (articles) => {
            const { sendDiscordNotification } = await import(
              "../../scripts/discord-webhook.js"
            );
            return sendDiscordNotification(articles);
          },
        ],
      ]) {
        try {
          const notification = await send(report.newArticles);
          if (notification?.success === false) {
            throw new Error(notification.error || "알 수 없는 오류");
          }
        } catch (error) {
          const message = `${label} 알림 실패: ${error.message}`;
          report.errors.push({ stage: "notification", message });
          if (failOnError) throw crawlError("notification", message);
        }
      }
    }
  } catch (error) {
    fatalError = error;
    const detail = {
      stage: error.stage || "processing",
      message: error.message,
    };
    if (error.feed) detail.feed = error.feed;
    if (
      !report.errors.some(
        (entry) =>
          entry.stage === detail.stage &&
          entry.message === detail.message &&
          entry.feed === detail.feed,
      )
    ) {
      report.errors.push(detail);
    }
  }
  finish();
  try {
    await emitProgress();
  } catch (error) {
    fatalError ||= error;
    report.errors.push({ stage: "progress", message: error.message });
    finish();
  }
  if (fatalError && failOnError) {
    fatalError.crawlResult = snapshot();
    throw fatalError;
  }
  console.log(
    `📊 RSS 크롤링 ${report.status}: 처리 ${report.totalProcessed}개, 저장 ${report.totalNewArticles}개, 후보 ${report.totalCandidates}개, 보류 ${report.totalDeferred}개`,
  );
  return report;
}
