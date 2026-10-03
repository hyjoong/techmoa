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
} = {}) {
  const calls = {
    parsed: [],
    inserted: [],
    individual: [],
    batch: [],
    discord: [],
    delays: [],
  };
  class MockParser {
    constructor(options) {
      assert.equal(options.timeout, 10000);
    }
    async parseURL(url) {
      calls.parsed.push(url);
      if (parseError) throw parseError;
      return {
        items: [
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
            range() {
              return { order: async () => ({ data: [], error: null }) };
            },
          };
        },
        insert(articles) {
          assert.equal(table, "blogs");
          calls.inserted.push(...articles);
          return {
            select: async () => ({
              data: insertError
                ? null
                : articles.map((article, index) => ({
                    ...article,
                    id: index + 1,
                  })),
              error: insertError,
            }),
          };
        },
      };
    },
  };
  const mocks = {
    "rss-parser": MockParser,
    "../../scripts/ai-tags.js": {
      classifyArticleTags: async () => ({
        status: classificationStatus,
        tags: classificationStatus === "ok" ? ["backend"] : [],
        nonTech: false,
      }),
      baseTagsFromFeedCategory: () => [],
      mergeAndDedupe: (tags) => [...new Set(tags)],
    },
    "../../scripts/discord-webhook.js": {
      sendDiscordNotification: async (articles) => {
        calls.discord.push(...articles);
      },
    },
    "../../scripts/push-notification.js": {
      processNewArticleNotification: async (article) => {
        calls.individual.push(article);
      },
      sendBatchNotifications: async (articles) => {
        calls.batch.push(...articles);
      },
    },
    "../../scripts/rss/feeds.js": { RSS_FEEDS: [popularFeed, nextFeed] },
    "../../scripts/rss/summary.js": { createSummary: (value) => value },
    "../../scripts/rss/thumbnail.js": { extractThumbnail: async () => null },
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
      assert.ok(Object.hasOwn(mocks, name), `허용되지 않은 모듈: ${name}`);
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
