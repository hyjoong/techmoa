import { RSS_FEEDS } from "./feeds.js";
import { createRedactor, maskConsole, writeCrawlResult } from "./result.js";

export const RSS_CRAWLER_HELP = `사용법: pnpm crawl-rss [옵션]

  --dry-run              RSS·DB 읽기만 수행하는 미리보기 (AI·DB 쓰기·알림 없음)
  --feed NAME            등록된 정확한 피드 이름 (여러 번 지정 가능)
  --since DATE           YYYY-MM-DD는 한국시간 00시, ISO는 Z 또는 시간대 필수
  --max-per-feed N       피드마다 처리할 신규 후보 글 최대 수 (양의 정수)
  --max-ai-articles N    실행 전체 AI 분류 대상 글 최대 수 (내부 HTTP 재시도는 별도)
  --no-notifications     개별·배치 푸시 및 Discord 알림 비활성화
  --output PATH          결과 JSON 경로 (기본: rss-crawl-results.json)
  --help                 환경 설정 없이 도움말 표시

날짜·개수 상한이 없으면 선택한 피드의 전체 대상 글을 처리합니다.
종료 코드: 0 성공(새 글 0개 포함), 1 전체/일부 실패, 2 인자 오류.
`;

function invalid(message) {
  throw new Error(message);
}

export function parseSince(value) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2}))?$/,
  );
  if (!match)
    invalid("--since는 날짜 또는 시간대가 명시된 ISO 형식이어야 합니다.");
  const [, year, month, day, hour, minute, second, , offset] = match;
  const date = `${year}-${month}-${day}`;
  const midnight = new Date(`${date}T00:00:00.000Z`);
  if (
    Number(year) === 0 ||
    !Number.isFinite(midnight.getTime()) ||
    midnight.toISOString().slice(0, 10) !== date ||
    (hour !== undefined && Number(hour) > 23) ||
    (minute !== undefined && Number(minute) > 59) ||
    (second !== undefined && Number(second) > 59) ||
    (offset &&
      offset !== "Z" &&
      (Number(offset.slice(1, 3)) > 23 || Number(offset.slice(4)) > 59))
  ) {
    invalid("--since에 유효하지 않은 날짜 또는 시간이 있습니다.");
  }
  const normalized = new Date(
    hour === undefined ? `${date}T00:00:00+09:00` : value,
  );
  if (!Number.isFinite(normalized.getTime()))
    invalid("--since가 유효하지 않습니다.");
  return normalized.toISOString();
}

function positiveInteger(value, option) {
  const parsed = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(parsed) || parsed <= 0) {
    invalid(`${option}는 0보다 큰 안전한 정수여야 합니다.`);
  }
  return parsed;
}

export function parseRssArgs(args, availableFeeds = RSS_FEEDS) {
  const result = {
    help: false,
    dryRun: false,
    sendNotifications: true,
    since: null,
    maxArticlesPerFeed: null,
    maxAiArticles: null,
    output: "rss-crawl-results.json",
    feeds: availableFeeds,
  };
  const known = new Set([
    "--help",
    "--dry-run",
    "--no-notifications",
    "--feed",
    "--since",
    "--max-per-feed",
    "--max-ai-articles",
    "--output",
  ]);
  const booleans = new Set(["--help", "--dry-run", "--no-notifications"]);
  const used = new Set();
  const selected = new Set();
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const equals = argument.indexOf("=");
    const option = equals < 0 ? argument : argument.slice(0, equals);
    if (!known.has(option))
      invalid("알 수 없는 인자가 있습니다. --help를 확인하세요.");
    if (used.has(option) && option !== "--feed")
      invalid(`${option}는 한 번만 지정하세요.`);
    used.add(option);
    if (booleans.has(option)) {
      if (equals >= 0) invalid(`${option}는 값을 받지 않습니다.`);
      if (option === "--help") result.help = true;
      if (option === "--dry-run") result.dryRun = true;
      if (option === "--no-notifications") result.sendNotifications = false;
      continue;
    }
    const value = equals >= 0 ? argument.slice(equals + 1) : args[++index];
    if (value === undefined || !value.trim() || value.startsWith("--")) {
      invalid(`${option}의 값이 필요합니다.`);
    }
    if (option === "--feed") {
      if (!availableFeeds.some((feed) => feed.name === value))
        invalid("등록되지 않은 피드 이름입니다.");
      selected.add(value);
    } else if (option === "--since") result.since = parseSince(value);
    else if (option === "--max-per-feed")
      result.maxArticlesPerFeed = positiveInteger(value, option);
    else if (option === "--max-ai-articles")
      result.maxAiArticles = positiveInteger(value, option);
    else if (option === "--output") {
      if (value.includes("\0")) invalid("--output 경로가 유효하지 않습니다.");
      result.output = value;
    }
  }
  if (selected.size > 0)
    result.feeds = availableFeeds.filter((feed) => selected.has(feed.name));
  if (result.dryRun) result.sendNotifications = false;
  return result;
}

function initialResult(options) {
  return {
    schemaVersion: 1,
    status: "running",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    durationMs: 0,
    dryRun: options.dryRun,
    notificationsEnabled: options.sendNotifications,
    selectedFeeds: options.feeds.map((feed) => feed.name),
    since: options.since,
    maxArticlesPerFeed: options.maxArticlesPerFeed,
    maxAiArticles: options.maxAiArticles,
    totalProcessed: 0,
    totalNewArticles: 0,
    totalDuplicates: 0,
    totalExcluded: 0,
    totalCandidates: 0,
    totalDeferred: 0,
    totalSkippedByDate: 0,
    totalAiArticles: 0,
    feedResults: [],
    errors: [],
    warnings: [],
  };
}

export async function runRssCli(args, dependencies = {}) {
  const logger = dependencies.logger ?? console;
  let options;
  try {
    options = parseRssArgs(args, dependencies.feeds ?? RSS_FEEDS);
  } catch (error) {
    logger.error(`인자 오류: ${error.message}`);
    return 2;
  }
  if (options.help) {
    logger.log(RSS_CRAWLER_HELP);
    return 0;
  }

  const environment = dependencies.environment ?? process.env;
  const loadEnvironment =
    dependencies.loadEnvironment ??
    (async () => {
      const { default: dotenv } = await import("dotenv");
      return dotenv.config({ quiet: true });
    });
  const loadService =
    dependencies.loadService ??
    (() => import("../../lib/server/rss-crawler-service.js"));
  const writeResult = dependencies.writeResult ?? writeCrawlResult;
  let latest = initialResult(options);
  let redact = createRedactor(environment);
  const restoreConsole = maskConsole(logger, (text) => redact(text));
  const disabledCredentials = new Map();
  const persist = async (snapshot) => {
    latest = { ...latest, ...snapshot };
    await writeResult(options.output, latest, redact);
  };
  try {
    const loaded = await loadEnvironment();
    redact = createRedactor(environment, loaded?.parsed);
    if (loaded?.error && loaded.error.code !== "ENOENT") throw loaded.error;
    if (!options.sendNotifications) {
      for (const key of [
        "DISCORD_WEBHOOK_URL",
        "FIREBASE_SERVICE_ACCOUNT_KEY",
      ]) {
        disabledCredentials.set(key, environment[key]);
        // 빈 값으로 유지해 알림 모듈의 dotenv가 재주입하지 못하게 한다.
        environment[key] = "";
      }
    }
    if (options.dryRun) {
      disabledCredentials.set(
        "FIREWORKS_API_KEY",
        environment.FIREWORKS_API_KEY,
      );
      environment.FIREWORKS_API_KEY = "";
      logger.log("미리보기: AI 호출, DB 쓰기, 알림을 실행하지 않습니다.");
    }
    await persist(latest);
    const { runRssCrawl } = await loadService();
    const result = await runRssCrawl({
      feeds: options.feeds,
      sendNotifications: options.sendNotifications,
      dryRun: options.dryRun,
      since: options.since,
      maxArticlesPerFeed: options.maxArticlesPerFeed,
      maxAiArticles: options.maxAiArticles,
      onProgress: persist,
    });
    await persist(result);
    logger.log(
      `수집 결과: ${latest.status}, 새 글 ${latest.totalNewArticles ?? 0}개. 보고서: ${options.output}`,
    );
    return latest.status === "success" ? 0 : 1;
  } catch (error) {
    const snapshot = error?.crawlResult ?? latest;
    const finishedAt = new Date().toISOString();
    latest = {
      ...latest,
      ...snapshot,
      status:
        snapshot.status === "partial_failure" ||
        snapshot.totalNewArticles > 0 ||
        snapshot.feedResults?.some((feed) => feed.success)
          ? "partial_failure"
          : "failed",
      finishedAt,
      durationMs:
        Date.parse(finishedAt) -
        Date.parse(snapshot.startedAt ?? latest.startedAt),
      errors: [
        ...(snapshot.errors ?? []),
        { stage: "cli", message: error?.message ?? String(error) },
      ],
    };
    try {
      await persist(latest);
    } catch (writeError) {
      logger.error(`결과 파일 저장 실패: ${writeError.message}`);
    }
    logger.error(`수집 실패: ${error?.message ?? String(error)}`);
    return 1;
  } finally {
    for (const [key, value] of disabledCredentials) {
      if (value === undefined) delete environment[key];
      else environment[key] = value;
    }
    restoreConsole();
  }
}
