import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { ALL_FILTER_TAGS } from "../lib/tag-data.js";

const source = ts.transpileModule(
  readFileSync(new URL("../scripts/ai-tags.js", import.meta.url), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  },
).outputText;
const article = {
  title: "React 렌더링 성능 개선",
  summary: "메모이제이션과 리렌더링",
  author: "오프라인 테스트",
};

function loadClassifier({
  replies = [],
  env = {},
  missingKey = false,
  stall = null,
} = {}) {
  const calls = { requests: [], timers: [], cancelled: 0 };
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    process: {
      env: {
        ...(missingKey ? {} : { FIREWORKS_API_KEY: "synthetic-key" }),
        ...env,
      },
    },
    console: { warn() {}, error() {} },
    AbortController,
    setTimeout(callback, ms) {
      const timer = { callback, ms, cleared: false };
      calls.timers.push(timer);
      if (ms !== 30000) queueMicrotask(callback);
      return timer;
    },
    clearTimeout(timer) {
      timer.cleared = true;
    },
    require(name) {
      if (name === "dotenv") return { config() {} };
      if (name === "../lib/tag-data.js") return { ALL_FILTER_TAGS };
      throw new Error(`예상하지 못한 의존성: ${name}`);
    },
    async fetch(url, options) {
      const index = calls.requests.length;
      calls.requests.push({ url, ...options, body: JSON.parse(options.body) });
      const waitForAbort = () =>
        new Promise((resolve, reject) => {
          options.signal.addEventListener(
            "abort",
            () => reject(new Error("synthetic abort")),
            { once: true },
          );
          queueMicrotask(() =>
            calls.timers.findLast((timer) => timer.ms === 30000).callback(),
          );
        });
      if (stall === "headers") return waitForAbort();
      const reply = replies[index] ?? { content: '["react"]' };
      if (reply instanceof Error) throw reply;
      const status = reply.status ?? 200;
      return {
        ok: status >= 200 && status < 300,
        status,
        body: {
          locked: false,
          async cancel() {
            calls.cancelled++;
          },
        },
        async json() {
          if (stall === "body") return waitForAbort();
          return (
            reply.data ?? {
              choices: [
                {
                  finish_reason: reply.finishReason ?? "stop",
                  message: { content: reply.content },
                },
              ],
            }
          );
        },
        async text() {
          return reply.error ?? "synthetic provider error";
        },
      };
    },
  });
  return { ...exports, calls };
}

test("서버리스 모델과 JSON 스키마로 요청하고 정상 태그를 반환한다", async () => {
  const h = loadClassifier({
    replies: [{ content: '["React", "react", "web"]' }],
  });
  const result = await h.classifyArticleTags(article);
  assert.equal(result.status, "ok");
  assert.deepEqual([...result.tags], ["react", "web"]);
  assert.equal(result.nonTech, false);
  const request = h.calls.requests[0];
  assert.equal(request.body.model, "accounts/fireworks/models/gpt-oss-120b");
  assert.equal(request.body.max_tokens, 2048);
  assert.equal(request.body.reasoning_effort, "low");
  assert.equal(request.body.response_format.type, "json_schema");
  assert.deepEqual(
    [...request.body.response_format.json_schema.schema.items.enum],
    ALL_FILTER_TAGS,
  );
  assert.equal(request.signal.aborted, true);
  assert.equal(h.calls.cancelled, 1);
  assert.ok(h.calls.timers.every((timer) => timer.cleared));
});

test("환경의 모델 override를 보존한다", async () => {
  const h = loadClassifier({
    env: { FIREWORKS_MODEL: "synthetic-custom-model" },
  });
  await h.classifyArticleTags(article);
  assert.equal(h.calls.requests[0].body.model, "synthetic-custom-model");
});

test("정상 종료된 명시적 빈 배열만 비기술 판정으로 사용한다", async () => {
  const h = loadClassifier({ replies: [{ content: " [] " }] });
  const result = await h.classifyArticleTags(article);
  assert.equal(result.status, "ok");
  assert.equal(result.nonTech, true);
  assert.equal(result.tags.length, 0);
});

test("빈 응답·잘린 JSON·잘못된 형식은 글 제외에 사용하지 않는다", async () => {
  for (const reply of [
    { content: "" },
    { content: "  " },
    { data: { choices: [] } },
    { content: "[]", finishReason: "length" },
    { content: "[]", finishReason: "content_filter" },
    { content: '["react"' },
    { content: "react,web" },
    { content: '{"tags":[]}' },
    { content: "null" },
    { content: "[null]" },
    { content: "[1]" },
    { content: '[""]' },
    { content: '["  "]' },
    { content: '["unknown-offline-tag"]' },
  ]) {
    const h = loadClassifier({ replies: [reply] });
    const result = await h.classifyArticleTags(article);
    assert.equal(result.status, "error", JSON.stringify(reply));
    assert.equal(result.nonTech, false, JSON.stringify(reply));
    assert.equal(result.tags.length, 0);
    assert.ok(result.error);
    assert.equal(h.calls.requests.length, 1);
  }
});

test("허용 태그와 알 수 없는 태그가 섞이면 허용 태그만 보존한다", async () => {
  const h = loadClassifier({
    replies: [{ content: '["unknown-offline-tag", "react"]' }],
  });
  const result = await h.classifyArticleTags(article);
  assert.deepEqual([...result.tags], ["react"]);
  assert.equal(result.nonTech, false);
});

test("404·401은 재시도하지 않고 원인을 보고한다", async () => {
  for (const status of [404, 401]) {
    const h = loadClassifier({
      replies: [{ status, error: "Model not found" }],
    });
    const result = await h.classifyArticleTags(article);
    assert.equal(result.status, "error");
    assert.match(result.error, new RegExp(`status=${status}`));
    assert.equal(result.nonTech, false);
    assert.equal(h.calls.requests.length, 1);
    assert.equal(h.calls.cancelled, 1);
  }
});

test("429·5xx 재시도는 최대 세 번이고 기존 대기 시간을 유지한다", async () => {
  const h = loadClassifier({
    replies: [{ status: 429 }, { status: 503 }, { content: '["react"]' }],
  });
  const result = await h.classifyArticleTags(article);
  assert.equal(result.status, "ok");
  assert.equal(h.calls.requests.length, 3);
  assert.deepEqual(
    h.calls.timers
      .filter((timer) => timer.ms !== 30000)
      .map((timer) => timer.ms),
    [5000, 10000],
  );
  assert.ok(h.calls.requests.every((request) => request.signal.aborted));
  assert.equal(h.calls.cancelled, 3);
  const failed = loadClassifier({
    replies: [{ status: 500 }, { status: 500 }, { status: 500 }],
  });
  assert.equal((await failed.classifyArticleTags(article)).status, "error");
  assert.equal(failed.calls.requests.length, 3);
});

test("요청과 응답 본문 모두 시간 초과 시 abort하고 비기술로 판정하지 않는다", async () => {
  for (const stall of ["headers", "body"]) {
    const h = loadClassifier({ stall });
    const result = await h.classifyArticleTags(article);
    assert.equal(result.status, "error");
    assert.match(result.error, /30초/);
    assert.equal(result.nonTech, false);
    assert.equal(h.calls.requests[0].signal.aborted, true);
    assert.ok(h.calls.timers.every((timer) => timer.cleared));
  }
});

test("설정 누락은 요청 없이 unavailable이며 기존 태그 매핑은 유지한다", async () => {
  const h = loadClassifier({ missingKey: true });
  const result = await h.classifyArticleTags(article);
  assert.equal(result.status, "unavailable");
  assert.equal(result.nonTech, false);
  assert.ok(result.error);
  assert.equal(h.calls.requests.length, 0);
  assert.deepEqual([...h.baseTagsFromFeedCategory("FE")], ["frontend", "web"]);
});
