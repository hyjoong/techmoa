import fs from "node:fs/promises";
import { pathToFileURL } from "node:url";

const escapeCell = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\|/g, "&#124;")
    .replace(/\r?\n/g, " ")
    .replace(/`/g, "&#96;");

const count = (value) => (Number.isFinite(value) ? value : 0);

export function renderCrawlSummary(report) {
  if (report?.schemaVersion !== 1 || !Array.isArray(report.feedResults)) {
    throw new Error("지원하지 않는 수집 결과 형식입니다.");
  }
  const labels = {
    success: "완료",
    partial_failure: "일부 실패",
    failed: "실패",
    running: "실행 중 또는 중단됨",
  };
  const lines = [
    "## RSS 수집 결과",
    "",
    `상태: **${labels[report.status] || "확인 필요"}** · ${report.dryRun ? "미리보기" : "실제 수집"}`,
    "",
    `저장 ${count(report.totalNewArticles)}건 · 중복 ${count(report.totalDuplicates)}건 · 제외 ${count(report.totalExcluded)}건 · 한도로 보류 ${count(report.totalDeferred)}건`,
    `신규 후보 ${count(report.totalCandidates)}건 · 기간 밖 ${count(report.totalSkippedByDate)}건 · AI 분류 ${count(report.totalAiArticles)}건`,
    "",
  ];
  if (report.dryRun) {
    lines.push(
      "미리보기 후보는 AI 판정 전 최대 예상 건수입니다. DB 쓰기·AI 호출·알림은 실행하지 않습니다.",
      "",
    );
  }
  lines.push(
    "| 블로그 | 상태 | 처리 | 저장 | 중복 | 제외 | 신규 후보 | 보류 | 소요 시간 |",
    "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
  );
  for (const feed of report.feedResults) {
    lines.push(
      `| ${escapeCell(feed.feed)} | ${feed.success ? "성공" : "실패"} | ${count(feed.processed)} | ${count(feed.inserted)} | ${count(feed.duplicates)} | ${count(feed.excluded)} | ${count(feed.candidates)} | ${count(feed.deferred)} | ${(count(feed.durationMs) / 1000).toFixed(1)}초 |`,
    );
  }
  if (report.errors?.length) {
    lines.push("", "### 오류", "");
    for (const error of report.errors) {
      lines.push(
        `- ${escapeCell(error.feed || "전체 실행")} / ${escapeCell(error.stage)}: ${escapeCell(error.message)}`,
      );
    }
  }
  const warnings = [
    ...(report.warnings || []),
    ...report.feedResults.flatMap((feed) =>
      (feed.warnings || []).map((warning) => `[${feed.feed}] ${warning}`),
    ),
  ];
  if (warnings.length) {
    lines.push("", "### 참고", "");
    for (const warning of new Set(warnings)) {
      lines.push(`- ${escapeCell(warning)}`);
    }
  }
  return lines.join("\n") + "\n";
}

export async function writeWorkflowSummary({
  reportPath = "rss-crawl-results.json",
  summaryPath = process.env.GITHUB_STEP_SUMMARY,
} = {}) {
  let markdown;
  try {
    markdown = renderCrawlSummary(
      JSON.parse(await fs.readFile(reportPath, "utf8")),
    );
  } catch {
    markdown =
      "## RSS 수집 결과\n\n결과 파일이 없거나 올바르지 않습니다. 실행 초기 오류와 앞선 단계의 로그를 확인하세요. 수집 성공으로 판단할 수 없습니다.\n";
  }
  if (summaryPath) await fs.appendFile(summaryPath, markdown);
  else process.stdout.write(markdown);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  writeWorkflowSummary().catch(() => {
    console.error("수집 실행 요약을 저장하지 못했습니다.");
    process.exitCode = 1;
  });
}
