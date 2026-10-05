import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { isDuplicate, normalizeUrl } from "../scripts/rss/dedup.js";
import {
  getExclusionReason,
  isNonTechClassification,
} from "../scripts/rss/filter.js";

const popularFeed = {
  name: "토스",
  url: "https://example.com/toss/rss.xml",
  type: "company",
};
const nextFeed = {
  name: "인프랩",
  url: "https://example.com/inflab/rss.xml",
  type: "company",
};

// 서비스 로직은 그대로 실행하고 RSS·DB·AI·알림·타이머만 격리한다.
// 허용 목록 밖 모듈은 로드하지 않으므로 dotenv와 실제 클라이언트도 실행되지 않는다.
function createHarness({
  parseError = null,
  insertError = null,
  classificationStatus = "ok",
  items,
  existingRows = [],
  excludedRows = [],
  serverCap = 1000,
  readError = null,
  exclusionError = null,
  classificationError = null,
  notificationError = null,
  batchResult,
  discordResult,
  notificationImportError = null,
} = {}) {
  const calls = {
    parsed: [],
    inserted: [],
    individual: [],
    batch: [],
    discord: [],
    delays: [],
    ai: [],
    exclusions: [],
    thumbnails: [],
    reads: [],
    modules: [],
    insertRequests: [],
  };
  class MockParser {
    constructor(options) {
      assert.equal(options.timeout, 10000);
    }
    async parseURL(url) {
      calls.parsed.push(url);
      const error =
        typeof parseError === "function" ? parseError(url) : parseError;
      if (error) throw error;
      return {
        items:
          typeof items === "function"
            ? items(url)
            : items || [
                {
                  title: "안전한 크롤러 테스트",
                  link: url.replace("rss.xml", "article"),
                  pubDate: "Fri, 02 Oct 2026 03:00:00 GMT",
                  contentSnippet: "합성 기술 글",
                },
              ],
      };
    }
  }
  const supabase = {
    from(table) {
      assert.ok(["blogs", "excluded_articles"].includes(table));
      return {
        select() {
          return {
            range(from, to) {
              return {
                order: async () => {
                  calls.reads.push({ table, from, to });
                  return {
                    data: (table === "blogs"
                      ? existingRows
                      : excludedRows
                    ).slice(from, Math.min(to + 1, from + serverCap)),
                    error:
                      typeof readError === "function"
                        ? readError(table)
                        : readError,
                  };
                },
              };
            },
          };
        },
        insert(articles) {
          assert.equal(table, "blogs");
          calls.inserted.push(...articles);
          calls.insertRequests.push(articles);
          const error =
            typeof insertError === "function"
              ? insertError(articles)
              : insertError;
          return {
            select: async () => ({
              data: error
                ? null
                : articles.map((article, index) => ({
                    ...article,
                    id: index + 1,
                  })),
              error,
            }),
          };
        },
        async upsert(article) {
          assert.equal(table, "excluded_articles");
          calls.exclusions.push(article);
          return { error: exclusionError };
        },
      };
    },
  };
  const mocks = {
    "rss-parser": MockParser,
    "../../scripts/ai-tags.js": {
      classifyArticleTags: async (article) => {
        calls.ai.push(article);
        if (classificationError) throw classificationError;
        const status =
          typeof classificationStatus === "function"
            ? classificationStatus(article)
            : classificationStatus;
        return typeof status === "object"
          ? status
          : {
              status,
              tags: status === "ok" ? ["backend"] : [],
              nonTech: false,
            };
      },
      baseTagsFromFeedCategory: () => [],
      mergeAndDedupe: (tags) => [...new Set(tags)],
    },
    "../../scripts/discord-webhook.js": {
      sendDiscordNotification: async (articles) => {
        calls.discord.push(...articles);
        return discordResult;
      },
    },
    "../../scripts/push-notification.js": {
      processNewArticleNotification: async (article) => {
        calls.individual.push(article);
        if (notificationError) throw notificationError;
      },
      sendBatchNotifications: async (articles) => {
        calls.batch.push(...articles);
        return batchResult;
      },
    },
    "../../scripts/rss/feeds.js": { RSS_FEEDS: [popularFeed, nextFeed] },
    "../../scripts/rss/summary.js": { createSummary: (value) => value },
    "../../scripts/rss/thumbnail.js": {
      extractThumbnail: async (item) => {
        calls.thumbnails.push(item);
        return null;
      },
    },
    "../../scripts/rss/dedup.js": { normalizeUrl, isDuplicate },
    "../../scripts/rss/filter.js": {
      getExclusionReason,
      isNonTechClassification,
    },
    "./supabase-admin.js": {
      createSupabaseAdminClient() {
        throw new Error("테스트에서 실제 DB 클라이언트를 만들 수 없습니다.");
      },
    },
  };
  const source = ts.transpileModule(
    readFileSync(
      new URL("../lib/server/rss-crawler-service.js", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    require(name) {
      calls.modules.push(name);
      assert.ok(Object.hasOwn(mocks, name), `허용되지 않은 모듈: ${name}`);
      if (
        notificationImportError &&
        name === "../../scripts/push-notification.js"
      ) {
        throw notificationImportError;
      }
      return mocks[name];
    },
    process: { env: {} },
    console: { log() {}, warn() {}, error() {} },
    setTimeout(callback, delay) {
      calls.delays.push(delay);
      callback();
    },
  });
  return { ...exports, calls, supabase };
}

test("알림 비활성화는 인기 블로그의 개별·배치·Discord 알림을 모두 막는다", async () => {
  const harness = createHarness();
  const result = await harness.runRssCrawl({
    feeds: [popularFeed],
    supabase: harness.supabase,
    sendNotifications: false,
    failOnError: true,
  });

  assert.equal(result.totalNewArticles, 1);
  assert.equal(harness.calls.inserted.length, 1);
  assert.equal(harness.calls.individual.length, 0);
  assert.equal(harness.calls.batch.length, 0);
  assert.equal(harness.calls.discord.length, 0);
  assert.deepEqual(harness.calls.delays, [8000, 1000]);
});

test("알림 기본값은 개별·배치·Discord 호출을 유지한다", async () => {
  const harness = createHarness();
  const result = await harness.runRssCrawl({
    feeds: [popularFeed],
    supabase: harness.supabase,
  });

  assert.equal(result.totalNewArticles, 1);
  assert.equal(harness.calls.individual.length, 1);
  assert.equal(harness.calls.individual[0].author, "토스");
  assert.equal(harness.calls.batch.length, 1);
  assert.equal(harness.calls.discord.length, 1);
});

test("배치·Discord 실패 반환은 저장된 결과와 함께 최종 보고서에 남는다", async () => {
  const harness = createHarness({
    batchResult: { success: false, error: "FCM unavailable" },
    discordResult: { success: false, error: "Discord HTTP 500" },
  });
  const result = await harness.runRssCrawl({
    feeds: [nextFeed],
    supabase: harness.supabase,
  });
  assert.equal(result.status, "partial_failure");
  assert.equal(result.totalNewArticles, 1);
  assert.equal(result.errors.length, 2);
  assert.ok(result.errors.every((error) => error.stage === "notification"));
  assert.match(result.errors[0].message, /FCM unavailable/);
  assert.match(result.errors[1].message, /Discord HTTP 500/);
});

test("알림 모듈 초기화 실패도 알림 단계로 남고 저장 건수를 보존한다", async () => {
  const harness = createHarness({
    notificationImportError: new Error("Module initialization failed"),
  });
  const result = await harness.runRssCrawl({
    feeds: [popularFeed],
    supabase: harness.supabase,
  });
  assert.equal(result.status, "partial_failure");
  assert.equal(result.totalNewArticles, 1);
  assert.ok(result.errors.every((error) => error.stage === "notification"));
  assert.equal(harness.calls.discord.length, 1);
});

test("개별 저장 함수도 명시한 알림 비활성화 옵션을 따른다", async () => {
  const harness = createHarness();
  const articles = await harness.parseFeed(popularFeed);
  const result = await harness.insertNewArticles(
    harness.supabase,
    articles,
    { urlSet: new Set(), authorTitleMap: new Map() },
    popularFeed,
    { sendNotifications: false },
  );

  assert.equal(result.inserted, 1);
  assert.equal(harness.calls.individual.length, 0);
});

for (const message of ["HTTP 503", "Invalid XML"]) {
  test(`엄격 모드는 ${message} 파싱 실패를 반환하고 후속 피드를 중단한다`, async () => {
    const harness = createHarness({ parseError: new Error(message) });
    await assert.rejects(
      harness.runRssCrawl({
        feeds: [popularFeed, nextFeed],
        supabase: harness.supabase,
        sendNotifications: false,
        failOnError: true,
      }),
      new RegExp(`토스 피드 파싱 실패: ${message}`),
    );

    assert.deepEqual(harness.calls.parsed, [popularFeed.url]);
    assert.equal(harness.calls.inserted.length, 0);
    assert.equal(harness.calls.individual.length, 0);
    assert.equal(harness.calls.batch.length, 0);
    assert.equal(harness.calls.discord.length, 0);
  });
}

test("기본 모드는 파싱 실패를 격리하고 후속 피드를 계속 처리한다", async () => {
  const harness = createHarness({ parseError: new Error("HTTP 503") });
  const result = await harness.runRssCrawl({ supabase: harness.supabase });

  assert.equal(result.totalProcessed, 0);
  assert.equal(result.totalNewArticles, 0);
  assert.deepEqual(harness.calls.parsed, [popularFeed.url, nextFeed.url]);
});

test("엄격 모드는 DB 저장 실패를 반환하고 후속 피드와 모든 알림을 중단한다", async () => {
  const harness = createHarness({
    insertError: { message: "DB 저장 거부" },
  });
  await assert.rejects(
    harness.runRssCrawl({
      feeds: [popularFeed, nextFeed],
      supabase: harness.supabase,
      failOnError: true,
    }),
    /\[토스\] 데이터 삽입 실패: DB 저장 거부/,
  );

  assert.deepEqual(harness.calls.parsed, [popularFeed.url]);
  assert.equal(harness.calls.inserted.length, 1);
  assert.equal(harness.calls.individual.length, 0);
  assert.equal(harness.calls.batch.length, 0);
  assert.equal(harness.calls.discord.length, 0);
});

test("기본 모드는 DB 저장 실패를 격리하고 후속 피드를 계속 처리한다", async () => {
  const harness = createHarness({
    insertError: { message: "DB 저장 거부" },
  });
  const result = await harness.runRssCrawl({ supabase: harness.supabase });

  assert.equal(result.totalProcessed, 2);
  assert.equal(result.totalNewArticles, 0);
  assert.deepEqual(harness.calls.parsed, [popularFeed.url, nextFeed.url]);
  assert.equal(harness.calls.inserted.length, 2);
  assert.equal(harness.calls.individual.length, 0);
  assert.equal(harness.calls.batch.length, 0);
  assert.equal(harness.calls.discord.length, 0);
});

for (const classificationStatus of ["error", "unavailable"]) {
  test(`엄격 모드는 AI 분류 ${classificationStatus} 상태에서 저장 없이 중단한다`, async () => {
    const harness = createHarness({ classificationStatus });
    await assert.rejects(
      harness.runRssCrawl({
        feeds: [popularFeed, nextFeed],
        supabase: harness.supabase,
        sendNotifications: false,
        failOnError: true,
      }),
      new RegExp(`태그 분류 실패 \\(${classificationStatus}\\)`),
    );

    assert.deepEqual(harness.calls.parsed, [popularFeed.url]);
    assert.equal(harness.calls.inserted.length, 0);
    assert.equal(harness.calls.individual.length, 0);
    assert.equal(harness.calls.batch.length, 0);
    assert.equal(harness.calls.discord.length, 0);
  });

  test(`기본 모드는 AI 분류 ${classificationStatus} 상태에서도 기존 저장 동작을 유지한다`, async () => {
    const harness = createHarness({ classificationStatus });
    const result = await harness.runRssCrawl({
      feeds: [popularFeed],
      supabase: harness.supabase,
      sendNotifications: false,
    });

    assert.equal(result.totalNewArticles, 1);
    assert.equal(harness.calls.inserted.length, 1);
    assert.deepEqual(Array.from(result.newArticles[0].tags), []);
  });
}

function item(id, date = "2026-10-04T03:00:00Z", title = `기술 글 ${id}`) {
  return {
    title,
    link: `https://example.com/articles/${id}`,
    pubDate: date,
    contentSnippet: "테스트 본문",
  };
}

test("dry-run은 후보를 계산하지만 AI·DB 쓰기·썸네일·알림 모듈을 실행하지 않는다", async () => {
  const harness = createHarness({
    items: [item(1), item(2, undefined, "[일상] 일기")],
  });
  const report = await harness.runRssCrawl({
    feeds: [popularFeed],
    supabase: harness.supabase,
    dryRun: true,
  });
  assert.equal(report.status, "success");
  assert.equal(report.dryRun, true);
  assert.equal(report.notificationsEnabled, false);
  assert.equal(report.totalCandidates, 1);
  assert.equal(report.totalExcluded, 1);
  assert.equal(report.totalNewArticles, 0);
  assert.equal(report.totalAiArticles, 0);
  assert.equal(harness.calls.ai.length, 0);
  assert.equal(harness.calls.inserted.length, 0);
  assert.equal(harness.calls.exclusions.length, 0);
  assert.equal(harness.calls.thumbnails.length, 0);
  assert.equal(harness.calls.individual.length, 0);
  assert.equal(harness.calls.batch.length, 0);
  assert.equal(harness.calls.discord.length, 0);
  assert.equal(
    harness.calls.modules.some((name) => /notification|discord/.test(name)),
    false,
  );
  assert.ok(harness.calls.reads.length > 0);
});

test("알림 비활성화는 알림 모듈 초기화도 막는다", async () => {
  const harness = createHarness();
  await harness.runRssCrawl({
    feeds: [popularFeed],
    supabase: harness.supabase,
    sendNotifications: false,
  });
  assert.equal(
    harness.calls.modules.some((name) => /notification|discord/.test(name)),
    false,
  );
});

test("날짜 범위를 먼저 적용하고 최신 신규 후보를 상한까지 선택한다", async () => {
  const duplicate = item("duplicate", "2026-10-05T00:00:00Z");
  const harness = createHarness({
    existingRows: [
      { external_url: duplicate.link, title: duplicate.title, author: "토스" },
    ],
    items: [
      item("older", "2026-09-30T00:00:00Z"),
      item("boundary", "2026-10-01T00:00:00Z"),
      duplicate,
      item("filtered", "2026-10-05T01:00:00Z", "[여행] 기록"),
      item("newest", "2026-10-04T00:00:00Z"),
      item("deferred", "2026-10-02T00:00:00Z"),
    ],
  });
  const report = await harness.runRssCrawl({
    feeds: [popularFeed],
    supabase: harness.supabase,
    sendNotifications: false,
    since: "2026-10-01T00:00:00Z",
    maxArticlesPerFeed: 2,
  });
  assert.equal(report.totalProcessed, 6);
  assert.equal(report.totalSkippedByDate, 1);
  assert.equal(report.totalDuplicates, 1);
  assert.equal(report.totalExcluded, 1);
  assert.equal(report.totalCandidates, 2);
  assert.equal(report.totalDeferred, 1);
  assert.deepEqual(
    harness.calls.ai.map((article) => article.title),
    ["기술 글 newest", "기술 글 deferred"],
  );
  assert.equal(harness.calls.exclusions.length, 1);
  assert.equal(
    harness.calls.thumbnails.some((entry) => entry.title === "기술 글 older"),
    false,
  );
});

test("since와 같은 시각의 글은 수집 대상이다", async () => {
  const harness = createHarness({
    items: [item("boundary", "2026-10-01T00:00:00Z")],
  });
  const report = await harness.runRssCrawl({
    feeds: [popularFeed],
    supabase: harness.supabase,
    dryRun: true,
    since: "2026-10-01T00:00:00Z",
  });
  assert.equal(report.totalCandidates, 1);
  assert.equal(report.totalSkippedByDate, 0);
});

for (const dryRun of [false, true]) {
  test(`실행 전체 AI 글 상한은 피드 사이에 공유되고 초과분은 보류된다 (dryRun=${dryRun})`, async () => {
    const harness = createHarness({
      items: (url) => [item(`${url}-1`), item(`${url}-2`)],
    });
    const report = await harness.runRssCrawl({
      supabase: harness.supabase,
      dryRun,
      sendNotifications: false,
      maxAiArticles: 3,
    });
    assert.equal(report.status, "success");
    assert.equal(report.totalCandidates, 3);
    assert.equal(report.totalDeferred, 1);
    assert.equal(report.totalAiArticles, dryRun ? 0 : 3);
    assert.equal(harness.calls.ai.length, dryRun ? 0 : 3);
    assert.deepEqual(
      Array.from(report.feedResults, (feed) => feed.candidates),
      [2, 1],
    );
    assert.deepEqual(
      Array.from(report.feedResults, (feed) => feed.deferred),
      [0, 1],
    );
  });
}

test("파싱 실패를 0건 성공과 구분하고 나머지 피드 결과를 함께 반환한다", async () => {
  const harness = createHarness({
    parseError: (url) =>
      url === popularFeed.url ? new Error("HTTP 503") : null,
  });
  const report = await harness.runRssCrawl({
    supabase: harness.supabase,
    sendNotifications: false,
  });
  assert.equal(report.status, "partial_failure");
  assert.deepEqual(
    Array.from(report.feedResults, (feed) => feed.status),
    ["failed", "success"],
  );
  assert.equal(report.errors[0].stage, "parse");
  assert.equal(report.errors[0].feed, popularFeed.name);
  assert.equal(report.totalNewArticles, 1);
});

test("저장 실패한 URL이 다음 피드에서 중복으로 사라지지 않는다", async () => {
  const harness = createHarness({
    items: [item("shared")],
    insertError: (articles) =>
      articles[0].author === "토스" ? { message: "DB unavailable" } : null,
  });
  const report = await harness.runRssCrawl({
    supabase: harness.supabase,
    sendNotifications: false,
  });
  assert.equal(report.status, "partial_failure");
  assert.equal(report.totalNewArticles, 1);
  assert.equal(report.totalDuplicates, 0);
  assert.equal(harness.calls.insertRequests.length, 2);
  assert.equal(report.feedResults[0].errors[0].stage, "insert");
});

test("DB와 제외 인덱스는 서버가 짧게 반환해도 마지막 페이지까지 읽는다", async () => {
  const harness = createHarness({
    serverCap: 1,
    existingRows: [
      {
        external_url: item("db-1").link,
        author: "토스",
        title: item("db-1").title,
      },
      {
        external_url: item("db-2").link,
        author: "토스",
        title: item("db-2").title,
      },
    ],
    excludedRows: [
      { external_url: item("excluded-1").link },
      { external_url: item("excluded-2").link },
    ],
    items: [item("db-2"), item("excluded-2"), item("new")],
  });
  const report = await harness.runRssCrawl({
    feeds: [popularFeed],
    supabase: harness.supabase,
    dryRun: true,
  });
  assert.equal(report.totalDuplicates, 2);
  assert.equal(report.totalCandidates, 1);
  for (const table of ["blogs", "excluded_articles"]) {
    assert.deepEqual(
      harness.calls.reads
        .filter((call) => call.table === table)
        .map((call) => call.from),
      [0, 1, 2],
    );
  }
});

test("제외 테이블 조회·저장 실패는 보고서 경고로 남고 쓰기 실패 URL을 확정하지 않는다", async () => {
  const harness = createHarness({
    readError: (table) =>
      table === "excluded_articles" ? { message: "table missing" } : null,
    exclusionError: { message: "table missing" },
    items: [item("excluded", undefined, "[일상] 기록")],
  });
  const report = await harness.runRssCrawl({
    supabase: harness.supabase,
    sendNotifications: false,
  });
  assert.equal(report.status, "success");
  assert.ok(
    report.warnings.some((warning) => warning.includes("제외 기록 조회 실패")),
  );
  assert.ok(
    report.warnings.some((warning) => warning.includes("제외 기록 저장 실패")),
  );
  assert.equal(report.totalDuplicates, 0);
  assert.equal(harness.calls.exclusions.length, 2);
  assert.equal(harness.calls.ai.length, 0);
});

test("진행 콜백은 첫·각 피드·최종에 순서대로 독립적인 누적 보고서를 받는다", async () => {
  const harness = createHarness();
  const snapshots = [];
  const report = await harness.runRssCrawl({
    supabase: harness.supabase,
    dryRun: true,
    onProgress: async (snapshot) => {
      await Promise.resolve();
      snapshots.push({
        status: snapshot.status,
        feeds: snapshot.feedResults.length,
      });
      snapshot.errors.push({ stage: "test", message: "콜백 변경" });
    },
  });
  assert.deepEqual(snapshots, [
    { status: "running", feeds: 0 },
    { status: "running", feeds: 1 },
    { status: "running", feeds: 2 },
    { status: "success", feeds: 2 },
  ]);
  assert.equal(report.errors.length, 0);
  assert.equal(report.schemaVersion, 1);
  assert.ok(report.finishedAt);
  assert.ok(report.durationMs >= 0);
});

test("엄격 실패는 이미 처리한 피드가 담긴 crawlResult와 최종 콜백을 제공한다", async () => {
  const harness = createHarness({
    parseError: (url) =>
      url === nextFeed.url ? new Error("Invalid XML") : null,
  });
  const snapshots = [];
  await assert.rejects(
    harness.runRssCrawl({
      supabase: harness.supabase,
      sendNotifications: false,
      failOnError: true,
      onProgress: async (snapshot) => snapshots.push(snapshot),
    }),
    (error) => {
      assert.equal(error.crawlResult.status, "partial_failure");
      assert.equal(error.crawlResult.totalNewArticles, 1);
      assert.equal(error.crawlResult.feedResults.length, 2);
      assert.equal(error.crawlResult.errors.length, 1);
      assert.equal(error.crawlResult.errors[0].stage, "parse");
      return true;
    },
  );
  assert.equal(snapshots.at(-1).status, "partial_failure");
});

test("전체 초기 조회 실패는 failed 결과를 남기고 RSS·쓰기 작업을 시작하지 않는다", async () => {
  const harness = createHarness({ readError: { message: "read denied" } });
  const report = await harness.runRssCrawl({ supabase: harness.supabase });
  assert.equal(report.status, "failed");
  assert.equal(report.errors[0].stage, "existing_index");
  assert.equal(harness.calls.parsed.length, 0);
  assert.equal(harness.calls.inserted.length, 0);
});

test("AI 반환 오류와 던진 오류는 저장 동작을 유지하면서 실패 보고에 구분한다", async () => {
  for (const options of [
    { classificationStatus: "error" },
    { classificationStatus: "unavailable" },
    { classificationError: new Error("AI offline") },
  ]) {
    const harness = createHarness(options);
    const report = await harness.runRssCrawl({
      feeds: [popularFeed],
      supabase: harness.supabase,
      sendNotifications: false,
    });
    assert.equal(report.status, "partial_failure");
    assert.equal(report.totalNewArticles, 1);
    assert.equal(report.errors.length, 1);
    assert.equal(report.errors[0].stage, "ai");
  }
});

test("저장 후 알림 실패가 발생해도 삽입 건수와 오류가 함께 보존된다", async () => {
  const harness = createHarness({
    notificationError: new Error("notification offline"),
  });
  const report = await harness.runRssCrawl({
    feeds: [popularFeed],
    supabase: harness.supabase,
  });
  assert.equal(report.status, "partial_failure");
  assert.equal(report.totalNewArticles, 1);
  assert.equal(report.newArticles.length, 1);
  assert.equal(report.errors[0].stage, "notification");
});

test("잘못된 범위 옵션은 외부 의존성을 호출하기 전에 거부한다", async () => {
  for (const options of [
    { maxAiArticles: 0 },
    { maxArticlesPerFeed: -1 },
    { maxAiArticles: 1.5 },
    { since: "2026-10-01" },
  ]) {
    const harness = createHarness();
    await assert.rejects(
      harness.runRssCrawl({ supabase: harness.supabase, ...options }),
    );
    assert.equal(harness.calls.reads.length, 0);
    assert.equal(harness.calls.parsed.length, 0);
    assert.equal(harness.calls.ai.length, 0);
  }
});
