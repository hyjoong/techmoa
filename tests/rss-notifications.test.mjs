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
  {
    env = {},
    sendError,
    sendImpl,
    initializeError,
    cleanupError,
    fetchError,
    fetchImpl,
    bodyImpl,
    status = 204,
  } = {},
) {
  const calls = {
    firebase: [],
    fetch: [],
    initialized: 0,
    apps: [],
    deleted: [],
    messagingApps: [],
    timers: [],
    cleared: [],
    bodyReads: 0,
  };
  const externalApp = {
    name: "external-app",
    delete() {
      throw new Error("외부 앱은 삭제하면 안 됩니다.");
    },
  };
  const mocks = {
    dotenv: { config() {} },
    "firebase-admin": {
      apps: [externalApp],
      initializeApp() {
        calls.initialized++;
        if (initializeError) throw initializeError;
        const app = {
          name: `owned-app-${calls.initialized}`,
          async delete() {
            calls.deleted.push(app.name);
            if (cleanupError) throw cleanupError;
          },
        };
        calls.apps.push(app);
        return app;
      },
      credential: { cert: () => ({}) },
      messaging(app) {
        calls.messagingApps.push(app?.name);
        assert.ok(
          calls.apps.includes(app),
          "이 모듈이 만든 Firebase 앱만 사용해야 합니다.",
        );
        return {
          async send(message) {
            calls.firebase.push(message);
            // FCM 전송 우선순위와 Android UI 우선순위는 서로 다른 규약이다.
            assert.ok(["normal", "high"].includes(message.android.priority));
            if (message.android.notification?.priority !== undefined) {
              assert.ok(
                ["min", "low", "default", "high", "max"].includes(
                  message.android.notification.priority,
                ),
              );
            }
            assert.ok(
              Object.values(message.data).every(
                (value) => typeof value === "string",
              ),
            );
            if (sendError) throw sendError;
            return sendImpl ? sendImpl(message) : "offline-message";
          },
        };
      },
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
    AbortController,
    setTimeout(callback, delay) {
      const timer = {
        callback,
        delay,
        unreferenced: false,
        unref() {
          this.unreferenced = true;
        },
      };
      calls.timers.push(timer);
      return timer;
    },
    clearTimeout(timer) {
      calls.cleared.push(timer);
    },
    require(name) {
      assert.ok(Object.hasOwn(mocks, name), `허용되지 않은 모듈: ${name}`);
      return mocks[name];
    },
    async fetch(url, options) {
      calls.fetch.push({ url, options });
      if (fetchError) throw fetchError;
      if (fetchImpl) return fetchImpl(url, options);
      return {
        ok: status >= 200 && status < 300,
        status,
        text: async () => {
          calls.bodyReads += 1;
          return bodyImpl ? bodyImpl(options) : "synthetic response";
        },
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
  assert.equal(harness.calls.firebase[0].android.priority, "normal");
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
  assert.equal(harness.calls.firebase[0].android.priority, "normal");
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
    assert.equal(harness.calls.cleared.length, 1);
  }
});

test("Discord 성공과 선택적 미설정·빈 목록 건너뛰기는 실패로 처리하지 않는다", async () => {
  const configured = loadNotificationModule("discord-webhook.js", {
    env: { DISCORD_WEBHOOK_URL: "https://example.com/synthetic-webhook" },
  });
  const success = await configured.sendDiscordNotification([article]);
  assert.equal(success.success, true);
  assert.equal(success.count, 1);
  assert.equal(configured.calls.bodyReads, 1);
  assert.equal(configured.calls.timers[0].delay, 15000);
  assert.equal(configured.calls.timers[0].unreferenced, true);
  assert.equal(configured.calls.cleared[0], configured.calls.timers[0]);
  const empty = await configured.sendDiscordNotification([]);
  assert.equal(empty.skipped, true);
  assert.equal(configured.calls.fetch.length, 1);

  const unconfigured = loadNotificationModule("discord-webhook.js");
  const skipped = await unconfigured.sendDiscordNotification([article]);
  assert.equal(skipped.success, true);
  assert.equal(skipped.skipped, true);
  assert.equal(unconfigured.calls.fetch.length, 0);
  assert.equal(unconfigured.calls.timers.length, 0);
});

test("즉시 푸시는 high 전송 우선순위를 유지하고 두 토픽에 한 번씩 보낸다", async () => {
  const harness = loadNotificationModule("push-notification.js", {
    env: { FIREBASE_SERVICE_ACCOUNT_KEY: '{"project_id":"offline-test"}' },
  });
  assert.equal(
    harness.calls.initialized,
    0,
    "import만으로 Firebase를 초기화하지 않습니다.",
  );
  const result = await harness.sendInstantNotification({
    ...article,
    author: "토스",
  });
  assert.equal(result.success, true);
  assert.equal(harness.calls.firebase.length, 2);
  assert.equal(harness.calls.firebase[0].topic, "blog_");
  assert.equal(harness.calls.firebase[1].topic, "all_blogs");
  for (const message of harness.calls.firebase) {
    assert.equal(message.android.priority, "high");
    assert.equal(message.android.notification.priority, "high");
    assert.equal(message.apns.payload.aps.sound, "default");
  }
});

test("Firebase 정리는 자신이 만든 앱만 삭제하고 반복·미초기화 호출에도 안전하다", async () => {
  const harness = loadNotificationModule("push-notification.js", {
    env: { FIREBASE_SERVICE_ACCOUNT_KEY: '{"project_id":"offline-test"}' },
  });
  await harness.cleanupPushNotifications();
  assert.equal(harness.calls.initialized, 0);
  assert.equal(harness.calls.deleted.length, 0);
  await harness.sendBatchNotifications([article]);
  await Promise.all([
    harness.cleanupPushNotifications(),
    harness.cleanupPushNotifications(),
  ]);
  assert.deepEqual(harness.calls.deleted, ["owned-app-1"]);
  await harness.cleanupPushNotifications();
  assert.deepEqual(harness.calls.deleted, ["owned-app-1"]);
  await harness.sendBatchNotifications([article]);
  await harness.cleanupPushNotifications();
  assert.deepEqual(harness.calls.deleted, ["owned-app-1", "owned-app-2"]);
});

test("Firebase 정리는 전송 실패 후에도 실행되고 초기화 실패 때 외부 앱은 보존한다", async () => {
  const failingSend = loadNotificationModule("push-notification.js", {
    env: { FIREBASE_SERVICE_ACCOUNT_KEY: '{"project_id":"offline-test"}' },
    sendError: new Error("Synthetic FCM failure"),
  });
  await failingSend.sendBatchNotifications([article]);
  await failingSend.cleanupPushNotifications();
  assert.deepEqual(failingSend.calls.deleted, ["owned-app-1"]);
  assert.equal(
    failingSend.calls.firebase.length,
    1,
    "실패한 메시지를 재전송하지 않습니다.",
  );

  const failingInit = loadNotificationModule("push-notification.js", {
    env: { FIREBASE_SERVICE_ACCOUNT_KEY: '{"project_id":"offline-test"}' },
    initializeError: new Error("An external default app already exists"),
  });
  const result = await failingInit.sendBatchNotifications([article]);
  await failingInit.cleanupPushNotifications();
  assert.equal(result.success, false);
  assert.equal(failingInit.calls.deleted.length, 0);
});

test("진행 중 즉시 알림 두 전송이 모두 끝나기 전 Firebase 앱을 삭제하지 않는다", async () => {
  const releases = [];
  const harness = loadNotificationModule("push-notification.js", {
    env: { FIREBASE_SERVICE_ACCOUNT_KEY: '{"project_id":"offline-test"}' },
    sendImpl: () => new Promise((resolve) => releases.push(resolve)),
  });
  const sending = harness.sendInstantNotification({
    ...article,
    author: "토스",
  });
  await Promise.resolve();
  assert.equal(releases.length, 1);
  const cleanup = harness.cleanupPushNotifications();
  assert.equal(harness.calls.deleted.length, 0);
  releases[0]("first-message");
  for (let step = 0; step < 8 && releases.length < 2; step += 1)
    await Promise.resolve();
  assert.equal(releases.length, 2);
  assert.equal(harness.calls.deleted.length, 0);
  releases[1]("second-message");
  assert.equal((await sending).success, true);
  await cleanup;
  assert.deepEqual(harness.calls.deleted, ["owned-app-1"]);
  assert.equal(harness.calls.firebase.length, 2);
});

test("Firebase 정리 오류는 호출자에게 전달되고 재전송하지 않는다", async () => {
  const harness = loadNotificationModule("push-notification.js", {
    env: { FIREBASE_SERVICE_ACCOUNT_KEY: '{"project_id":"offline-test"}' },
    cleanupError: new Error("Synthetic cleanup failure"),
  });
  await harness.sendBatchNotifications([article]);
  await assert.rejects(
    harness.cleanupPushNotifications(),
    /Synthetic cleanup failure/,
  );
  assert.equal(harness.calls.firebase.length, 1);
});

test("Discord 응답 대기와 본문 대기는 제한 시간이 지나면 취소하고 타이머를 해제한다", async () => {
  const waitForAbort = (signal) =>
    new Promise((resolve, reject) => {
      if (signal.aborted) reject(signal.reason);
      else
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        });
    });
  for (const options of [
    { fetchImpl: (url, request) => waitForAbort(request.signal) },
    { bodyImpl: (request) => waitForAbort(request.signal) },
  ]) {
    const harness = loadNotificationModule("discord-webhook.js", {
      env: { DISCORD_WEBHOOK_URL: "https://example.com/synthetic-webhook" },
      ...options,
    });
    const pending = harness.sendDiscordNotification([article]);
    await Promise.resolve();
    harness.calls.timers[0].callback();
    const result = await pending;
    assert.equal(result.success, false);
    assert.match(result.error, /timed out after 15000ms/);
    assert.equal(
      harness.calls.fetch.length,
      1,
      "타임아웃 후 자동 재전송하지 않습니다.",
    );
    assert.equal(harness.calls.fetch[0].options.signal.aborted, true);
    assert.equal(harness.calls.cleared[0], harness.calls.timers[0]);
  }
});
