import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { parseRssArgs, parseSince, runRssCli } from "../scripts/rss/cli.js";
import {
  createRedactor,
  serializeCrawlResult,
  writeCrawlResult,
} from "../scripts/rss/result.js";

const feeds = [
  { name: "인프랩", type: "company", url: "https://example.test/inflab/rss" },
  { name: "NHN Cloud", type: "company", url: "https://example.test/nhn/rss" },
];

function harness({ service, environment = {} } = {}) {
  const calls = {
    environment: 0,
    service: 0,
    options: [],
    reports: [],
    logs: [],
  };
  const logger = Object.fromEntries(
    ["log", "warn", "error", "info", "debug", "trace"].map((method) => [
      method,
      (...args) => calls.logs.push(args.join(" ")),
    ]),
  );
  const dependencies = {
    feeds,
    logger,
    environment,
    loadEnvironment: async () => {
      calls.environment += 1;
      return { parsed: { ...environment } };
    },
    loadService: async () => {
      calls.service += 1;
      return {
        runRssCrawl: async (options) => {
          calls.options.push(options);
          if (service) return service(options, calls, logger);
          return { status: "success", totalNewArticles: 0, feedResults: [] };
        },
      };
    },
    writeResult: async (path, result, redact) => {
      calls.reports.push({
        path,
        result: JSON.parse(serializeCrawlResult(result, redact)),
      });
    },
  };
  return { calls, dependencies, logger };
}

test("잘못된 인자는 환경 설정·서비스 import·보고서 쓰기 전에 종료 코드 2를 반환한다", async () => {
  const invalid = [
    ["--unknown"],
    ["positional"],
    ["--feed"],
    ["--feed", ""],
    ["--feed", "미등록"],
    ["--feed", " 인프랩"],
    ["--since"],
    ["--output="],
    ["--output", "\0"],
    ["--dry-run=false"],
    ["--max-ai-requests", "1"],
    ["--max-per-feed", "1", "--max-per-feed", "2"],
    ["--feed", "--dry-run"],
    ["--help", "--unknown"],
  ];
  for (const option of ["--max-per-feed", "--max-ai-articles"]) {
    for (const value of [
      "",
      "0",
      "-1",
      "1.5",
      "NaN",
      "Infinity",
      "1e2",
      "2x",
      "9007199254740992",
    ]) {
      invalid.push([option, value]);
    }
    invalid.push([option]);
  }
  for (const args of invalid) {
    const { calls, dependencies } = harness();
    Object.defineProperty(dependencies, "environment", {
      get() {
        throw new Error("인자 오류에 환경 설정을 읽으면 안 됩니다.");
      },
    });
    assert.equal(await runRssCli(args, dependencies), 2, JSON.stringify(args));
    assert.equal(calls.environment, 0);
    assert.equal(calls.service, 0);
    assert.equal(calls.reports.length, 0);
  }
});

test("--since는 한국시간 날짜와 명시적 시간대를 UTC로 정규화하고 잘못된 날짜를 거부한다", () => {
  assert.equal(parseSince("2026-10-05"), "2026-10-04T15:00:00.000Z");
  assert.equal(parseSince("2024-02-29"), "2024-02-28T15:00:00.000Z");
  assert.equal(
    parseSince("2026-10-05T03:15+09:00"),
    "2026-10-04T18:15:00.000Z",
  );
  assert.equal(
    parseSince("2026-10-05T03:15:20.123Z"),
    "2026-10-05T03:15:20.123Z",
  );
  assert.equal(
    parseSince("2026-10-05T03:15:00-04:00"),
    "2026-10-05T07:15:00.000Z",
  );
  for (const value of [
    "2026-02-29",
    "2026-02-30",
    "2026-13-01",
    "2026-00-01",
    "2026-10-00",
    "2026-10-05T00:00:00",
    "2026-10-05T24:00:00Z",
    "2026-10-05T12:60Z",
    "2026-10-05T12:00:60Z",
    "2026-10-05T12:00+25:00",
    "2026-10-05T12:00+09:60",
    "2026-10-05Z",
    "2026-1-5",
    "2026-10-05 ",
    "today",
    "",
  ])
    assert.throws(() => parseSince(value), undefined, value);
});

test("반복 --feed는 정확한 이름으로 선택하고 같은 이름을 중복 실행하지 않는다", () => {
  const options = parseRssArgs(
    [
      "--feed",
      "NHN Cloud",
      "--feed=인프랩",
      "--feed",
      "인프랩",
      "--since=2026-10-05",
      "--max-per-feed",
      "10",
      "--max-ai-articles=12",
      "--no-notifications",
      "--output",
      "reports/result.json",
    ],
    feeds,
  );
  assert.deepEqual(options.feeds, feeds);
  assert.equal(options.since, "2026-10-04T15:00:00.000Z");
  assert.equal(options.maxArticlesPerFeed, 10);
  assert.equal(options.maxAiArticles, 12);
  assert.equal(options.sendNotifications, false);
  assert.equal(options.output, "reports/result.json");
});

test("도움말은 환경 설정이 없어도 실행되며 글 단위 AI 상한과 재시도를 구분한다", async () => {
  const { calls, dependencies } = harness();
  assert.equal(await runRssCli(["--help"], dependencies), 0);
  assert.equal(calls.environment, 0);
  assert.equal(calls.service, 0);
  assert.equal(calls.reports.length, 0);
  assert.match(
    calls.logs.join("\n"),
    /AI 분류 대상 글 최대 수.*HTTP 재시도는 별도/,
  );
  assert.match(calls.logs.join("\n"), /AI·DB 쓰기·알림 없음/);
});

test("엔트리 import·--help·잘못된 인자가 실제 dotenv를 로드하지 않는다", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "techgom-cli-entry-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(
    join(directory, ".env"),
    "RSS_CLI_TEST_SENTINEL=synthetic-value\n",
  );
  const entry = fileURLToPath(
    new URL("../scripts/rss-crawler.js", import.meta.url),
  );
  for (const args of [null, ["--help"], ["--bad-option"]]) {
    const script = `
      import { pathToFileURL } from 'node:url';
      ${args ? `process.argv = [process.execPath, ${JSON.stringify(entry)}, ...${JSON.stringify(args)}];` : ""}
      await import(pathToFileURL(${JSON.stringify(entry)}).href);
      if (process.env.RSS_CLI_TEST_SENTINEL !== undefined) throw new Error('dotenv was loaded');
    `;
    const child = spawnSync(
      process.execPath,
      ["--input-type=module", "-e", script],
      {
        cwd: directory,
        env: {},
        encoding: "utf8",
        timeout: 10000,
      },
    );
    assert.equal(
      child.status,
      args?.[0] === "--bad-option" ? 2 : 0,
      child.stderr,
    );
    assert.doesNotMatch(child.stdout + child.stderr, /synthetic-value/);
  }
  assert.deepEqual(await readdir(directory), [".env"]);
});

test("dry-run은 기존 알림·AI 자격 증명도 서비스 import 전에 차단하고 옵션을 전달한다", async () => {
  const original = {
    DISCORD_WEBHOOK_URL: "https://secret.test/hook",
    FIREBASE_SERVICE_ACCOUNT_KEY: '{"private_key":"synthetic-private-key"}',
    FIREWORKS_API_KEY: "synthetic-ai-key",
  };
  const environment = { ...original };
  const { calls, dependencies } = harness({ environment });
  const originalLoader = dependencies.loadService;
  dependencies.loadService = async () => {
    assert.equal(environment.DISCORD_WEBHOOK_URL, "");
    assert.equal(environment.FIREBASE_SERVICE_ACCOUNT_KEY, "");
    assert.equal(environment.FIREWORKS_API_KEY, "");
    return originalLoader();
  };
  assert.equal(
    await runRssCli(
      ["--dry-run", "--feed", "인프랩", "--max-ai-articles", "3"],
      dependencies,
    ),
    0,
  );
  assert.equal(calls.options[0].dryRun, true);
  assert.equal(calls.options[0].sendNotifications, false);
  assert.equal(calls.options[0].maxAiArticles, 3);
  assert.deepEqual(calls.options[0].feeds, [feeds[0]]);
  assert.deepEqual(environment, original);
});

test("--no-notifications는 알림만 차단하고 AI 설정은 보존한다", async () => {
  const environment = { FIREWORKS_API_KEY: "synthetic-ai-key" };
  const { dependencies } = harness({
    environment,
    service: async (options) => {
      assert.equal(options.sendNotifications, false);
      assert.equal(options.dryRun, false);
      assert.equal(environment.FIREWORKS_API_KEY, "synthetic-ai-key");
      assert.equal(environment.DISCORD_WEBHOOK_URL, "");
      assert.equal(environment.FIREBASE_SERVICE_ACCOUNT_KEY, "");
      return { status: "success" };
    },
  });
  assert.equal(await runRssCli(["--no-notifications"], dependencies), 0);
  assert.deepEqual(environment, { FIREWORKS_API_KEY: "synthetic-ai-key" });
});

test("시작·피드 완료·종료 보고서를 저장하고 새 글 0개 성공과 실패를 구분한다", async () => {
  for (const status of ["success", "partial_failure", "failed"]) {
    const { calls, dependencies } = harness({
      service: async (options) => {
        await options.onProgress({
          status: "running",
          feedResults: [{ feed: "인프랩", success: true, processed: 0 }],
        });
        return {
          status,
          totalNewArticles: 0,
          newArticles: [{ summary: "보고서에 저장하지 않는 본문" }],
        };
      },
    });
    assert.equal(
      await runRssCli([], dependencies),
      status === "success" ? 0 : 1,
    );
    assert.deepEqual(
      calls.reports.map(({ result }) => result.status),
      ["running", "running", status],
    );
    assert.equal(calls.reports[1].result.feedResults.length, 1);
    assert.equal(calls.reports.at(-1).result.totalNewArticles, 0);
    assert.ok(!Object.hasOwn(calls.reports.at(-1).result, "newArticles"));
    assert.equal(calls.reports[0].path, "rss-crawl-results.json");
  }
});

test("중간 예외는 성공한 피드 결과를 보존하고 SDK 오류·JSON의 설정값을 마스킹한다", async () => {
  const secret = "synthetic-service-key";
  const { calls, dependencies } = harness({
    environment: { SUPABASE_SERVICE_ROLE_KEY: secret },
    service: async (options, unused, logger) => {
      await options.onProgress({
        totalNewArticles: 2,
        feedResults: [{ feed: "인프랩", success: true, inserted: 2 }],
      });
      logger.error(new Error(`SDK failed with ${secret}`));
      throw new Error(`request error ${secret}`);
    },
  });
  assert.equal(await runRssCli([], dependencies), 1);
  const result = calls.reports.at(-1).result;
  assert.equal(result.status, "partial_failure");
  assert.equal(result.totalNewArticles, 2);
  assert.equal(result.feedResults[0].inserted, 2);
  assert.match(result.errors.at(-1).message, /\[REDACTED\]/);
  assert.doesNotMatch(JSON.stringify(calls), new RegExp(secret));
  assert.ok(result.finishedAt);
});

test("서비스 import 오류·error.crawlResult·초기 보고서 저장 실패를 종료 코드 1로 남긴다", async () => {
  const first = harness();
  first.dependencies.loadService = async () => {
    throw new Error("module unavailable");
  };
  assert.equal(await runRssCli([], first.dependencies), 1);
  assert.equal(first.calls.reports.at(-1).result.status, "failed");

  const second = harness({
    service: async () => {
      const error = new Error("strict failure");
      error.crawlResult = {
        status: "failed",
        totalProcessed: 5,
        feedResults: [{ feed: "인프랩", success: false }],
      };
      throw error;
    },
  });
  assert.equal(await runRssCli([], second.dependencies), 1);
  assert.equal(second.calls.reports.at(-1).result.totalProcessed, 5);

  const third = harness();
  third.dependencies.writeResult = async () => {
    throw new Error("disk full");
  };
  assert.equal(await runRssCli([], third.dependencies), 1);
  assert.equal(third.calls.service, 0);
});

test("최종 보고서 저장 재시도도 일부 저장된 글과 partial_failure 상태를 보존한다", async () => {
  const { calls, dependencies } = harness({
    service: async () => ({
      status: "partial_failure",
      totalNewArticles: 2,
      feedResults: [{ feed: "인프랩", success: false, inserted: 2 }],
      errors: [{ stage: "ai", message: "fallback tags used" }],
    }),
  });
  const originalWrite = dependencies.writeResult;
  let failedOnce = false;
  dependencies.writeResult = async (...args) => {
    if (args[1].status === "partial_failure" && !failedOnce) {
      failedOnce = true;
      throw new Error("temporary disk error");
    }
    await originalWrite(...args);
  };
  assert.equal(await runRssCli([], dependencies), 1);
  const result = calls.reports.at(-1).result;
  assert.equal(result.status, "partial_failure");
  assert.equal(result.totalNewArticles, 2);
  assert.equal(result.feedResults[0].inserted, 2);
  assert.deepEqual(
    result.errors.map((error) => error.stage),
    ["ai", "cli"],
  );
});

test("JSON 원자 저장은 이전 결과를 온전하게 교체하고 임시 파일·본문·비밀값을 남기지 않는다", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "techgom-cli-result-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const output = join(directory, "results.json");
  const environment = {
    FIREBASE_SERVICE_ACCOUNT_KEY: JSON.stringify({
      private_key: "line-one\nline-two",
      client_email: "private@example.test",
    }),
    SUPABASE_SERVICE_ROLE_KEY: "abc",
  };
  const redact = createRedactor(environment);
  await writeCrawlResult(output, { status: "running" }, redact);
  await writeCrawlResult(
    output,
    {
      status: "success",
      errors: [
        {
          message:
            "secret=abc line-one\nline-two private@example.test https://example.test/path?token=not-in-env",
        },
      ],
      authorization: "another-key",
      newArticles: [{ summary: "excluded article content" }],
    },
    redact,
  );
  const text = await readFile(output, "utf8");
  const parsed = JSON.parse(text);
  assert.equal(parsed.status, "success");
  assert.equal(parsed.authorization, "[REDACTED]");
  assert.ok(!Object.hasOwn(parsed, "newArticles"));
  assert.doesNotMatch(
    text,
    /abc|line-one|line-two|private@example|not-in-env|another-key|excluded article/,
  );
  assert.deepEqual(await readdir(directory), ["results.json"]);
  assert.equal((await stat(output)).mode & 0o777, 0o600);
});
