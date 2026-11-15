import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadClient({
  session = { user: { id: "reader-a" }, access_token: "token-a" },
  respond,
  app = false,
  from,
  bridge = {},
} = {}) {
  const calls = [];
  let activeSession = session;
  const exports = {};
  const source = ts.transpileModule(
    readFileSync(new URL("../lib/bookmarks.ts", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    },
  ).outputText;
  vm.runInNewContext(source, {
    exports,
    require: (name) => {
      if (name === "./supabase")
        return {
          supabase: {
            auth: {
              getSession: async () => ({
                data: { session: activeSession },
                error: null,
              }),
            },
            from:
              from ||
              (() => {
                throw new Error("웹에서는 DB를 직접 호출하면 안 됩니다.");
              }),
          },
        };
      if (name === "./webview-bridge")
        return { isFlutterWebView: () => app, ...bridge };
      return require(name);
    },
    fetch: async (url, options) => {
      calls.push({ url, options });
      return respond(url, options);
    },
    console,
  });
  return {
    client: exports,
    calls,
    setSession: (value) => {
      activeSession = value;
    },
  };
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

test("웹 북마크 저장은 사용자 ID 대신 토큰을 API에 전달한다", async () => {
  const { client, calls } = loadClient({
    respond: () => json({ bookmark: { id: "bookmark-a", blog_id: 10 } }),
  });
  const result = await client.addBookmark(10);
  assert.equal(result.error, null);
  assert.equal(result.bookmark.blog_id, 10);
  assert.equal(calls[0].url, "/api/me/bookmarks/10");
  assert.equal(calls[0].options.method, "PUT");
  assert.equal(calls[0].options.headers.Authorization, "Bearer token-a");
  assert.equal(calls[0].options.body, undefined);
  assert.equal(calls[0].options.cache, "no-store");
  assert.equal(calls[0].options.credentials, "omit");
});

test("로그인하지 않은 사용자는 북마크 API를 호출하지 않는다", async () => {
  const { client, calls } = loadClient({ session: null });
  const result = await client.addBookmark(10);
  assert.equal(result.error.code, "UNAUTHORIZED");
  assert.equal(calls.length, 0);
});

test("DB 반환 한도가 작아도 모든 ID 페이지를 읽고 중복을 제거한다", async () => {
  const pages = [
    { ids: [1, 2], nextOffset: 2 },
    { ids: [2, 3], nextOffset: 4 },
    { ids: [], nextOffset: null },
  ];
  const { client, calls } = loadClient({ respond: () => json(pages.shift()) });
  const result = await client.getUserBookmarks();
  assert.equal(result.error, null);
  assert.deepEqual(
    Array.from(result.bookmarks, (bookmark) => bookmark.blog_id),
    [1, 2, 3],
  );
  assert.equal(calls[1].url, "/api/me/bookmarks/ids?offset=2&limit=1000");
  assert.equal(calls[2].url, "/api/me/bookmarks/ids?offset=4&limit=1000");
});

test("글 연결이 비어 있는 페이지도 nextOffset이 있으면 다음 목록을 읽는다", async () => {
  const pages = [
    { blogs: [{ id: 1 }], nextOffset: 1 },
    { blogs: [], nextOffset: 2 },
    { blogs: [{ id: 3 }], nextOffset: 3 },
    { blogs: [], nextOffset: null },
  ];
  const controller = new AbortController();
  const { client, calls } = loadClient({ respond: () => json(pages.shift()) });
  const result = await client.getBookmarkedBlogs(controller.signal);
  assert.equal(result.error, null);
  assert.deepEqual(
    Array.from(result.blogs, (blog) => blog.id),
    [1, 3],
  );
  assert.equal(calls.length, 4);
  assert.equal(calls[0].options.signal, controller.signal);
});

test("계정이 바뀌면 이전 계정의 응답과 다음 페이지를 폐기한다", async () => {
  let harness;
  harness = loadClient({
    respond: () => {
      harness.setSession({ user: { id: "reader-b" }, access_token: "token-b" });
      return json({ ids: [1], nextOffset: 1 });
    },
  });
  const result = await harness.client.getUserBookmarks();
  assert.equal(result.error.code, "SESSION_CHANGED");
  assert.equal(result.bookmarks.length, 0);
  assert.equal(harness.calls.length, 1);
});

test("삭제의 204 응답과 인증 오류를 각각 처리한다", async () => {
  const { client } = loadClient({
    respond: () => new Response(null, { status: 204 }),
  });
  assert.equal((await client.removeBookmark(10)).error, null);
  const denied = loadClient({
    respond: () =>
      json(
        { error: { message: "로그인이 필요합니다.", code: "UNAUTHORIZED" } },
        401,
      ),
  });
  assert.equal(
    (await denied.client.removeBookmark(10)).error.code,
    "UNAUTHORIZED",
  );
});

test("잘못된 다음 페이지 응답으로 요청을 무한 반복하지 않는다", async () => {
  const { client, calls } = loadClient({
    respond: () => json({ ids: [1], nextOffset: 0 }),
  });
  assert.equal(
    (await client.getUserBookmarks()).error.code,
    "INVALID_RESPONSE",
  );
  assert.equal(calls.length, 1);
});

test("Flutter의 저장·해제·상태 확인은 기존 앱 브리지를 사용한다", async () => {
  const events = [];
  const query = {
    select: () => query,
    eq: () => query,
    single: async () => ({
      data: {
        id: 42,
        title: "앱 글",
        external_url: "https://example.com/article",
      },
      error: null,
    }),
  };
  const { client, calls } = loadClient({
    session: null,
    app: true,
    from: () => query,
    bridge: {
      saveBookmarkToApp: async (payload) => {
        events.push(["save", payload.id]);
        return { success: true };
      },
      removeBookmarkFromApp: async (id) => {
        events.push(["remove", id]);
        return { success: true };
      },
    },
  });
  assert.equal((await client.addBookmark(42)).error, null);
  assert.equal((await client.removeBookmark(42)).error, null);
  assert.deepEqual(events, [
    ["save", "42"],
    ["remove", "42"],
  ]);
  assert.equal(calls.length, 0);
});
