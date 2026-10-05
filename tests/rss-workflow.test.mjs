import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  renderCrawlSummary,
  writeWorkflowSummary,
} from "../scripts/rss/write-workflow-summary.js";

test("실패와 새 글 0건, 미리보기와 저장을 실행 요약에서 구분한다", () => {
  const summary = renderCrawlSummary({
    schemaVersion: 1,
    status: "partial_failure",
    dryRun: true,
    totalCandidates: 3,
    totalNewArticles: 0,
    totalDeferred: 2,
    feedResults: [
      { feed: "정상 피드", success: true, inserted: 0 },
      { feed: "실패 피드", success: false, inserted: 0 },
    ],
    errors: [{ feed: "실패 피드", stage: "parse", message: "HTTP 503" }],
  });
  assert.match(summary, /일부 실패/);
  assert.match(summary, /AI 판정 전 최대 예상/);
  assert.match(summary, /정상 피드 \| 성공/);
  assert.match(summary, /실패 피드 \| 실패/);
  assert.match(summary, /신규 후보 3건/);
  assert.match(summary, /parse: HTTP 503/);
});

test("피드 오류 문자열이 실행 요약의 HTML이나 표를 바꾸지 않는다", () => {
  const summary = renderCrawlSummary({
    schemaVersion: 1,
    status: "failed",
    feedResults: [{ feed: "A|B\n<script>", success: false }],
    errors: [{ stage: "parse", message: "<img src=x> `token`" }],
  });
  assert.doesNotMatch(summary, /<script>|<img|`token`/);
  assert.match(summary, /A&#124;B &lt;script&gt;/);
});

test("보고서가 없으면 성공 0건 대신 확인 불가로 기록한다", async (t) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "rss-summary-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const summaryPath = path.join(dir, "summary.md");
  await writeWorkflowSummary({
    reportPath: path.join(dir, "missing.json"),
    summaryPath,
  });
  assert.match(
    await fs.readFile(summaryPath, "utf8"),
    /성공으로 판단할 수 없습니다/,
  );
});

test("수동 입력은 셸 명령이 아닌 인수로 전달하고 정기 실행에는 한도를 적용한다", async (t) => {
  const yaml = await fs.readFile(
    new URL("../.github/workflows/rss-crawler.yml", import.meta.url),
    "utf8",
  );
  const script = yaml
    .split("      - name: Run RSS crawler\n")[1]
    .split("        run: |\n")[1]
    .split("        env:\n")[0]
    .replace(/^          /gm, "");
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "rss-workflow-"));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  await fs.writeFile(
    path.join(dir, "pnpm"),
    '#!/bin/bash\nprintf "%s\\0" "$@" > "$RSS_TEST_ARGS"\n',
    { mode: 0o700 },
  );
  const argsPath = path.join(dir, "args");
  const env = {
    PATH: `${dir}:/usr/bin:/bin`,
    RSS_TEST_ARGS: argsPath,
    GITHUB_EVENT_NAME: "workflow_dispatch",
    INPUT_DRY_RUN: "true",
    INPUT_SEND_NOTIFICATIONS: "false",
    INPUT_FEED: "NHN Cloud; $(touch must-not-exist)",
    INPUT_SINCE: "2026-10-01",
    INPUT_MAX_PER_FEED: "20",
    INPUT_MAX_AI_ARTICLES: "120",
  };
  const manual = spawnSync("/bin/bash", ["-e", "-c", script], {
    cwd: dir,
    env,
    encoding: "utf8",
  });
  assert.equal(manual.status, 0, manual.stderr);
  const args = (await fs.readFile(argsPath, "utf8"))
    .split("\0")
    .filter(Boolean);
  assert.equal(args[args.indexOf("--feed") + 1], env.INPUT_FEED);
  assert.ok(args.includes("--dry-run"));
  assert.ok(args.includes("--no-notifications"));
  await assert.rejects(fs.stat(path.join(dir, "must-not-exist")));
  const scheduled = spawnSync("/bin/bash", ["-e", "-c", script], {
    cwd: dir,
    env: { ...env, GITHUB_EVENT_NAME: "schedule" },
    encoding: "utf8",
  });
  assert.equal(scheduled.status, 0, scheduled.stderr);
  assert.deepEqual(
    (await fs.readFile(argsPath, "utf8")).split("\0").filter(Boolean),
    ["run", "crawl-rss", "--max-ai-articles", "120"],
  );
});
