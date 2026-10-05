import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const article = {
  id: 1,
  title: "오프라인 기술 글",
  author: "인프랩",
  external_url: "https://example.com/article",
};

// 실제 모듈 코드를 실행하되 dotenv·Firebase·fetch는 모두 격리한다.
function loadNotificationModule(
  file,
  { env = {}, sendError, fetchError, status = 204 } = {},
) {
  const calls = { firebase: [], fetch: [], initialized: 0 };
  const mocks = {
    dotenv: { config() {} },
    "firebase-admin": {
      initializeApp() {
        calls.initialized++;
      },
      credential: { cert: () => ({}) },
      messaging: () => ({
        async send(message) {
          calls.firebase.push(message);
          if (sendError) throw sendError;
          return "offline-message";
        },
      }),
    },
  };
  const source = ts.transpileModule(
    readFileSync(new URL(`../scripts/${file}`, import.meta.url), "utf8"),
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
    process: { env },
    console: { log() {}, warn() {}, error() {} },
    require(name) {
      assert.ok(Object.hasOwn(mocks, name), `허용되지 않은 모듈: ${name}`);
      return mocks[name];
    },
    async fetch(url, options) {
      calls.fetch.push({ url, options });
      if (fetchError) throw fetchError;
      return {
        ok: status >= 200 && status < 300,
        status,
        text: async () => "synthetic error",
      };
    },
  });
  return { ...exports, calls };
}

test("실제 배치 푸시 모듈은 일반 블로그 FCM 실패를 호출자에게 반환한다", async () => {
  const harness = loadNotificationModule("push-notification.js", {
    env: { FIREBASE_SERVICE_ACCOUNT_KEY: '{"project_id":"offline-test"}' },
    sendError: new Error("Synthetic FCM failure"),
  });
  const result = await harness.sendBatchNotifications([article]);
  assert.equal(result.success, false);
  assert.equal(result.error, "Synthetic FCM failure");
  assert.equal(harness.calls.firebase.length, 1);
  assert.equal(harness.calls.firebase[0].topic, "daily_summary");
});

test("Firebase 미설정 배치 실패도 반환하고 전송하지 않는다", async () => {
  const harness = loadNotificationModule("push-notification.js");
  const result = await harness.sendBatchNotifications([article]);
  assert.equal(result.success, false);
  assert.match(result.error, /Firebase not initialized/);
  assert.equal(harness.calls.firebase.length, 0);
});

test("일반 블로그 배치 성공과 전송 대상 없는 건너뛰기를 구분한다", async () => {
  const harness = loadNotificationModule("push-notification.js", {
    env: { FIREBASE_SERVICE_ACCOUNT_KEY: '{"project_id":"offline-test"}' },
  });
  const result = await harness.sendBatchNotifications([article]);
  assert.equal(result.success, true);
  assert.equal(result.count, 1);
  for (const articles of [[], [{ ...article, author: "토스" }]]) {
    const skipped = await harness.sendBatchNotifications(articles);
    assert.equal(skipped.success, true);
    assert.equal(skipped.skipped, true);
  }
  assert.equal(harness.calls.firebase.length, 1);
});

test("실제 Discord 모듈은 HTTP 오류와 네트워크 예외를 실패로 반환한다", async () => {
  for (const failure of [
    { status: 500 },
    { fetchError: new Error("Synthetic network failure") },
  ]) {
    const harness = loadNotificationModule("discord-webhook.js", {
      env: { DISCORD_WEBHOOK_URL: "https://example.com/synthetic-webhook" },
      ...failure,
    });
    const result = await harness.sendDiscordNotification([article]);
    assert.equal(result.success, false);
    assert.match(
      result.error,
      failure.status ? /HTTP 500/ : /Synthetic network failure/,
    );
    assert.equal(harness.calls.fetch.length, 1);
  }
});

test("Discord 성공과 선택적 미설정·빈 목록 건너뛰기는 실패로 처리하지 않는다", async () => {
  const configured = loadNotificationModule("discord-webhook.js", {
    env: { DISCORD_WEBHOOK_URL: "https://example.com/synthetic-webhook" },
  });
  const success = await configured.sendDiscordNotification([article]);
  assert.equal(success.success, true);
  assert.equal(success.count, 1);
  const empty = await configured.sendDiscordNotification([]);
  assert.equal(empty.skipped, true);
  assert.equal(configured.calls.fetch.length, 1);

  const unconfigured = loadNotificationModule("discord-webhook.js");
  const skipped = await unconfigured.sendDiscordNotification([article]);
  assert.equal(skipped.success, true);
  assert.equal(skipped.skipped, true);
  assert.equal(unconfigured.calls.fetch.length, 0);
});
