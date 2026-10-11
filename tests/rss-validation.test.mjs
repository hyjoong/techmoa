import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { RSS_FEEDS } from "../scripts/rss/feeds.js";

const blockedUrl = "https://techblog.woowahan.com/feed/";

function runValidation({
  failures = { [blockedUrl]: 403 },
  githubActions = true,
  url,
} = {}) {
  const validationUrl = new URL("../scripts/validate-rss.js", import.meta.url);
  const cliArgs = url ? ["--url", url] : [];
  const source = `
    import fs from 'node:fs';
    import axios from 'axios';
    const failures = ${JSON.stringify(failures)};
    const originalSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = (callback, delay, ...args) => {
      if (delay === 3000 && Object.values(failures).includes(429)) {
        callback(...args);
        return;
      }
      return originalSetTimeout(callback, delay, ...args);
    };
    const requestedUrls = [];
    const messages = [];
    let report;
    axios.get = async (url) => {
      requestedUrls.push(url);
      if (failures[url]) {
        const error = new Error('Request failed with status code ' + failures[url]);
        error.response = { status: failures[url] };
        throw error;
      }
      return {
        status: 200,
        headers: { 'content-type': 'application/rss+xml' },
        data: '<rss version="2.0"><channel><title>offline</title></channel></rss>',
      };
    };
    // 보고서를 디스크에 저장하지 않고 표준 출력으로만 부모에게 전달한다.
    fs.writeFileSync = (reportPath, data) => {
      report = { reportPath, results: JSON.parse(data) };
    };
    console.log = console.warn = console.error = (...args) => {
      messages.push(args.join(' '));
    };
    process.on('exit', () => {
      fs.writeSync(1, JSON.stringify({
        requestedUrls,
        messages,
        ...report,
      }));
    });
    process.argv = [process.execPath, ${JSON.stringify(fileURLToPath(validationUrl))}, ...${JSON.stringify(cliArgs)}];
    await import(${JSON.stringify(validationUrl.href)});
  `;
  const child = spawnSync(
    process.execPath,
    ["--input-type=module", "--eval", source],
    {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      env: { GITHUB_ACTIONS: String(githubActions) },
      encoding: "utf8",
      timeout: 5000,
    },
  );
  assert.ifError(child.error);
  assert.equal(child.signal, null, child.stderr);
  assert.equal(child.stderr, "");
  const report = JSON.parse(child.stdout);
  assert.equal(report.reportPath, "rss-validation-results.json");
  return { ...report, exitCode: child.status };
}

test("GitHub Actions에서 모든 피드를 검사하고 알려진 403만 수집 불가로 표시한다", () => {
  const report = runValidation();
  assert.equal(report.exitCode, 0);
  assert.deepEqual(
    report.requestedUrls,
    RSS_FEEDS.map((feed) => feed.url),
  );
  assert.equal(report.results.length, RSS_FEEDS.length);
  const invalid = report.results.filter((result) => !result.valid);
  assert.equal(invalid.length, 1);
  assert.equal(invalid[0].url, blockedUrl);
  assert.equal(invalid[0].blocked, true);
  assert.equal(invalid[0].status, 403);
  assert.equal(invalid[0].error, "Request failed with status code 403");
  assert.ok(invalid[0].warning);
  assert.match(report.messages.join("\n"), /수집 불가 피드: 1개/);
  assert.doesNotMatch(report.messages.join("\n"), /모든 RSS 피드가 유효합니다/);
});

test("선택한 피드가 모두 수집 불가이면 종료 코드 1을 반환한다", () => {
  const report = runValidation({ url: blockedUrl });
  assert.equal(report.exitCode, 1);
  assert.deepEqual(report.requestedUrls, [blockedUrl]);
  assert.equal(report.results.length, 1);
  assert.equal(report.results[0].valid, false);
  assert.equal(report.results[0].blocked, true);
  assert.match(report.messages.join("\n"), /정상 확인된 피드가 없습니다/);
});

test("GitHub Actions가 아닌 환경의 우아한형제들 403은 일반 실패이다", () => {
  const report = runValidation({ githubActions: false });
  assert.equal(report.exitCode, 1);
  const invalid = report.results.filter((result) => !result.valid);
  assert.equal(invalid.length, 1);
  assert.equal(invalid[0].url, blockedUrl);
  assert.equal(invalid[0].status, 403);
  assert.equal(invalid[0].blocked, undefined);
});

test("우아한형제들 503은 수집 불가 예외에 포함하지 않는다", () => {
  const report = runValidation({ failures: { [blockedUrl]: 503 } });
  assert.equal(report.exitCode, 1);
  const invalid = report.results.filter((result) => !result.valid);
  assert.equal(invalid.length, 1);
  assert.equal(invalid[0].status, 503);
  assert.equal(invalid[0].blocked, undefined);
});

test("다른 피드의 403은 알려진 수집 불가와 함께 발생해도 일반 실패이다", () => {
  const otherUrl = RSS_FEEDS.find((feed) => feed.url !== blockedUrl).url;
  const report = runValidation({
    failures: { [blockedUrl]: 403, [otherUrl]: 403 },
  });
  assert.equal(report.exitCode, 1);
  const other = report.results.find((result) => result.url === otherUrl);
  assert.equal(other.valid, false);
  assert.equal(other.status, 403);
  assert.equal(other.blocked, undefined);
  assert.equal(
    report.results.find((result) => result.url === blockedUrl).blocked,
    true,
  );
});

test("차단이 해제되면 우아한형제들도 다시 정상 피드로 기록한다", () => {
  const report = runValidation({ failures: {} });
  assert.equal(report.exitCode, 0);
  assert.equal(report.results.length, RSS_FEEDS.length);
  assert.ok(report.results.every((result) => result.valid));
  assert.ok(report.results.every((result) => !result.blocked));
  const recovered = report.results.find((result) => result.url === blockedUrl);
  assert.equal(recovered.status, 200);
  assert.equal(recovered.warning, null);
});

test("다른 피드의 429는 두 번 재시도한 뒤에도 계속되면 실행에 실패한다", () => {
  const otherUrl = RSS_FEEDS.find((feed) => feed.url !== blockedUrl).url;
  const report = runValidation({
    failures: { [blockedUrl]: 403, [otherUrl]: 429 },
  });
  assert.equal(report.exitCode, 1);
  assert.equal(
    report.requestedUrls.filter((url) => url === otherUrl).length,
    3,
  );
  const failed = report.results.find((result) => result.url === otherUrl);
  assert.equal(failed.valid, false);
  assert.equal(failed.status, 429);
  assert.equal(failed.blocked, undefined);
  assert.equal(
    report.results.find((result) => result.url === blockedUrl).blocked,
    true,
  );
});
