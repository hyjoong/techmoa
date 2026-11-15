import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// 실제 라우트·인증·서비스·저장소를 실행하고 Supabase 경계만 대체한다.
// 운영 환경 변수와 네트워크에는 접근하지 않는다.
function createHarness({
  bookmarks = [],
  blogs = [],
  serverCap = 1000,
  authError,
  fail,
  env = true,
} = {}) {
  const rows = structuredClone(bookmarks);
  const queries = [];
  const clients = [];
  const authCalls = [];
  const fetchCalls = [];
  let sequence = rows.length;

  function client() {
    return {
      auth: {
        async getUser(token) {
          authCalls.push(token);
          if (authError instanceof Error) throw authError;
          if (authError) return { data: { user: null }, error: authError };
          const id = { "signed-token-a": "user-a", "signed-token-b": "user-b" }[
            token
          ];
          return id
            ? { data: { user: { id } }, error: null }
            : {
                data: { user: null },
                error: { status: 401, message: "secret auth failure" },
              };
        },
      },
      from(table) {
        const state = {
          table,
          operation: "select",
          filters: [],
          orders: [],
          offset: 0,
          end: Infinity,
        };
        const query = {
          select(columns) {
            state.columns = columns;
            return query;
          },
          eq(column, value) {
            state.filters.push([column, value]);
            return query;
          },
          order(column, options) {
            state.orders.push([column, options.ascending]);
            return query;
          },
          range(offset, end) {
            state.offset = offset;
            state.end = end;
            return query;
          },
          returns() {
            return query;
          },
          single() {
            state.single = true;
            return query;
          },
          maybeSingle() {
            state.single = true;
            return query;
          },
          insert(value) {
            state.operation = "insert";
            state.insert = value;
            return query;
          },
          delete() {
            state.operation = "delete";
            return query;
          },
          then(resolve, reject) {
            return Promise.resolve()
              .then(() => {
                queries.push(structuredClone(state));
                const error = fail?.(state);
                if (error) return { data: null, error };
                if (state.operation === "insert") {
                  const existing = rows.find(
                    (row) =>
                      row.user_id === state.insert.user_id &&
                      row.blog_id === state.insert.blog_id,
                  );
                  if (existing)
                    return {
                      data: null,
                      error: {
                        code: "23505",
                        message: "secret unique constraint",
                      },
                    };
                  const created = {
                    id: `bookmark-${++sequence}`,
                    ...state.insert,
                    created_at: "2026-10-04T00:00:00.000Z",
                  };
                  rows.push(created);
                  return { data: { ...created }, error: null };
                }
                const source = table === "blogs" ? blogs : rows;
                let matching = source.filter((row) =>
                  state.filters.every(
                    ([column, value]) => row[column] === value,
                  ),
                );
                if (state.operation === "delete") {
                  for (const row of matching) rows.splice(rows.indexOf(row), 1);
                  return { data: null, error: null };
                }
                matching.sort((a, b) => {
                  for (const [column, ascending] of state.orders) {
                    if (a[column] !== b[column])
                      return (
                        (a[column] < b[column] ? -1 : 1) * (ascending ? 1 : -1)
                      );
                  }
                  return 0;
                });
                const count = Math.min(serverCap, state.end - state.offset + 1);
                const data = matching
                  .slice(state.offset, state.offset + count)
                  .map((row) => {
                    if (state.columns?.includes("blog:blogs")) {
                      return {
                        id: row.id,
                        created_at: row.created_at,
                        blog:
                          blogs.find((blog) => blog.id === row.blog_id) ?? null,
                      };
                    }
                    if (state.columns === "blog_id")
                      return { blog_id: row.blog_id };
                    return { ...row };
                  });
                return {
                  data: state.single ? (data[0] ?? null) : data,
                  error: null,
                };
              })
              .then(resolve, reject);
          },
        };
        return query;
      },
    };
  }

  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file);
    const source = ts.transpileModule(readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText;
    const exports = {};
    cache.set(file, exports);
    vm.runInNewContext(
      source,
      {
        exports,
        Request,
        Response,
        URL,
        process: {
          env: env
            ? {
                NEXT_PUBLIC_SUPABASE_URL: "https://test.invalid",
                NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-anon-key",
                SUPABASE_SERVICE_ROLE_KEY: "must-never-be-used",
              }
            : {},
        },
        fetch: async (input, init) => {
          fetchCalls.push({ input, init });
          return Response.json({});
        },
        require(name) {
          if (name === "@supabase/supabase-js") {
            return {
              createClient(url, key, options) {
                clients.push({ url, key, options });
                return client();
              },
            };
          }
          const resolved = name.startsWith("@/")
            ? path.join(root, name.slice(2))
            : path.resolve(path.dirname(file), name);
          assert.ok(
            resolved.startsWith(root),
            "테스트는 프로젝트 코드만 읽는다",
          );
          return load(`${resolved}.ts`);
        },
      },
      { filename: file },
    );
    return exports;
  }

  return {
    list: load(path.join(root, "app/api/me/bookmarks/route.ts")).GET,
    ids: load(path.join(root, "app/api/me/bookmarks/ids/route.ts")).GET,
    ...load(path.join(root, "app/api/me/bookmarks/[blogId]/route.ts")),
    rows,
    queries,
    clients,
    authCalls,
    fetchCalls,
  };
}

function request(
  route = "",
  { token = "signed-token-a", method = "GET", body, signal } = {},
) {
  return new Request(`https://techmoa.test/api/me/bookmarks${route}`, {
    method,
    signal,
    headers: token === null ? {} : { Authorization: `Bearer ${token}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

function context(blogId) {
  return { params: Promise.resolve({ blogId: String(blogId) }) };
}
function bookmark(id, userId, blogId, createdAt = "2026-01-01T00:00:00Z") {
  return { id, user_id: userId, blog_id: blogId, created_at: createdAt };
}
function assertPrivate(response, status) {
  assert.equal(response.status, status);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("vary"), "Authorization");
}

test("모든 API가 누락·위조 토큰을 거절하고 DB를 호출하지 않는다", async () => {
  for (const token of [null, "forged-token"]) {
    const harness = createHarness();
    const responses = await Promise.all([
      harness.list(request("", { token })),
      harness.ids(request("/ids", { token })),
      harness.PUT(request("/1", { token, method: "PUT" }), context(1)),
      harness.DELETE(request("/1", { token, method: "DELETE" }), context(1)),
    ]);
    for (const response of responses) {
      assertPrivate(response, 401);
      assert.equal((await response.json()).error.code, "UNAUTHORIZED");
    }
    assert.equal(harness.queries.length, 0);
  }
});

test("요청별 anon 클라이언트가 검증된 토큰과 취소 신호를 사용한다", async () => {
  const harness = createHarness();
  const controller = new AbortController();
  const req = request("", { signal: controller.signal });
  assertPrivate(await harness.list(req), 200);
  assertPrivate(
    await harness.ids(request("/ids", { token: "signed-token-b" })),
    200,
  );
  assert.deepEqual(harness.authCalls, ["signed-token-a", "signed-token-b"]);
  assert.equal(harness.clients.length, 2);
  const first = harness.clients[0];
  assert.equal(first.key, "public-anon-key");
  assert.equal(first.options.auth.persistSession, false);
  assert.equal(first.options.auth.autoRefreshToken, false);
  assert.equal(
    first.options.global.headers.Authorization,
    "Bearer signed-token-a",
  );
  await first.options.global.fetch("https://test.invalid", {});
  assert.equal(harness.fetchCalls[0].init.signal, req.signal);
});

test("잘못된 Authorization 형식은 인증 서버에 전달하지 않는다", async () => {
  const harness = createHarness();
  for (const value of [
    "Basic signed-token-a",
    "Bearer",
    "Bearer signed-token-a extra",
  ]) {
    const req = new Request("https://techmoa.test/api/me/bookmarks", {
      headers: { Authorization: value },
    });
    assertPrivate(await harness.list(req), 401);
  }
  assert.equal(harness.authCalls.length, 0);
  assert.equal(harness.clients.length, 0);
});

test("목록·ID 조회·삭제는 요청의 user_id 대신 인증한 사용자로 범위를 제한한다", async () => {
  const harness = createHarness({
    bookmarks: [bookmark("a", "user-a", 1), bookmark("b", "user-b", 2)],
    blogs: [
      { id: 1, title: "내 글" },
      { id: 2, title: "다른 글" },
    ],
  });
  const result = await (await harness.list(request("?user_id=user-b"))).json();
  assert.deepEqual(
    result.blogs.map((blog) => blog.id),
    [1],
  );
  const ids = await (await harness.ids(request("/ids?user_id=user-b"))).json();
  assert.deepEqual(ids.ids, [1]);
  assertPrivate(
    await harness.DELETE(
      request("/2?user_id=user-b", { method: "DELETE" }),
      context(2),
    ),
    204,
  );
  assert.equal(harness.rows.length, 2);
  assert.ok(
    harness.queries.every((query) =>
      query.filters.some(
        ([column, value]) => column === "user_id" && value === "user-a",
      ),
    ),
  );
});

test("PUT은 본인 ID로 저장하며 동시·반복 요청에서 기존 ID와 저장 시각을 보존한다", async () => {
  const harness = createHarness({ blogs: [{ id: 1 }] });
  const responses = await Promise.all(
    Array.from({ length: 8 }, () =>
      harness.PUT(
        request("/1", { method: "PUT", body: { user_id: "user-b" } }),
        context(1),
      ),
    ),
  );
  const saved = [];
  for (const response of responses) {
    assertPrivate(response, 200);
    saved.push((await response.json()).bookmark);
  }
  assert.equal(harness.rows.length, 1);
  assert.equal(saved[0].user_id, "user-a");
  assert.ok(
    saved.every(
      (row) => row.id === saved[0].id && row.created_at === saved[0].created_at,
    ),
  );
  assert.equal(
    harness.queries.filter((query) => query.operation === "insert").length,
    8,
  );
  assert.ok(
    harness.queries
      .filter(
        (query) => query.table === "bookmarks" && query.operation === "select",
      )
      .every((query) =>
        query.filters.some(
          ([column, value]) => column === "user_id" && value === "user-a",
        ),
      ),
  );
});

test("이미 저장된 글의 PUT은 본인의 기존 ID와 과거 저장 시각을 반환한다", async () => {
  const original = bookmark("original-a", "user-a", 1, "2020-01-01T00:00:00Z");
  const harness = createHarness({
    bookmarks: [bookmark("original-b", "user-b", 1), original],
    blogs: [{ id: 1 }],
  });
  const response = await harness.PUT(
    request("/1", { method: "PUT" }),
    context(1),
  );
  assertPrivate(response, 200);
  assert.deepEqual((await response.json()).bookmark, original);
  assert.equal(harness.rows.length, 2);
});

test("DELETE는 없는 북마크를 반복 삭제해도 본문 없는 204를 반환한다", async () => {
  const harness = createHarness({ bookmarks: [bookmark("a", "user-a", 1)] });
  for (let count = 0; count < 2; count++) {
    const response = await harness.DELETE(
      request("/1", { method: "DELETE" }),
      context(1),
    );
    assertPrivate(response, 204);
    assert.equal(await response.text(), "");
  }
  assert.equal(harness.rows.length, 0);
});

test("잘못된 글 ID와 페이지 값은 400이고 DB에 전달하지 않는다", async () => {
  const harness = createHarness();
  for (const id of [
    "0",
    "-1",
    "1.2",
    "01",
    "1e3",
    " 1",
    "9007199254740992",
    "abc",
  ]) {
    for (const method of ["PUT", "DELETE"]) {
      assertPrivate(
        await harness[method](request(`/${id}`, { method }), context(id)),
        400,
      );
    }
  }
  for (const suffix of [
    "?limit=0",
    "?limit=101",
    "?limit=",
    "?offset=-1",
    "?offset=2147483647",
    "?offset=1.1",
    "?offset=0&offset=1",
    "?limit=1&limit=2",
  ]) {
    assertPrivate(await harness.list(request(suffix)), 400);
  }
  assertPrivate(await harness.ids(request("/ids?limit=1001")), 400);
  assert.equal(harness.queries.length, 0);
});

test("존재하지 않는 글은 저장하지 않고 404를 반환한다", async () => {
  const harness = createHarness();
  const response = await harness.PUT(
    request("/7", { method: "PUT" }),
    context(7),
  );
  assertPrivate(response, 404);
  assert.equal((await response.json()).error.code, "BLOG_NOT_FOUND");
  assert.equal(harness.rows.length, 0);
});

test("DB 최대 행 수가 작은 경우에도 ID를 빈 페이지까지 빠짐없이 조회한다", async () => {
  const harness = createHarness({
    bookmarks: Array.from({ length: 5 }, (_, i) =>
      bookmark(`b${i}`, "user-a", i + 1),
    ).reverse(),
    serverCap: 2,
  });
  let offset = 0;
  const ids = [];
  while (offset !== null) {
    const response = await harness.ids(
      request(`/ids?offset=${offset}&limit=1000`),
    );
    assertPrivate(response, 200);
    const page = await response.json();
    ids.push(...page.ids);
    offset = page.nextOffset;
    assert.ok(harness.queries.length <= 4);
  }
  assert.deepEqual(ids, [1, 2, 3, 4, 5]);
  assert.deepEqual(
    harness.queries.map((query) => query.offset),
    [0, 2, 4, 5],
  );
});

test("글 조인이 null인 페이지도 원본 행 수로 전진하고 저장 시각·ID로 정렬한다", async () => {
  const harness = createHarness({
    bookmarks: [
      bookmark("a", "user-a", 1),
      bookmark("b", "user-a", 2),
      bookmark("c", "user-a", 3),
    ],
    blogs: [{ id: 1, title: "보이는 글" }],
    serverCap: 1,
  });
  let offset = 0;
  const blogs = [];
  const pages = [];
  while (offset !== null) {
    const page = await (
      await harness.list(request(`?offset=${offset}`))
    ).json();
    pages.push(page);
    blogs.push(...page.blogs);
    offset = page.nextOffset;
    assert.ok(harness.queries.length <= 4);
  }
  assert.deepEqual(pages[0], { blogs: [], nextOffset: 1 });
  assert.deepEqual(
    blogs.map((blog) => blog.id),
    [1],
  );
  assert.equal(blogs[0].bookmark_id, "a");
  assert.deepEqual(harness.queries[0].orders, [
    ["created_at", false],
    ["id", false],
  ]);
  assert.deepEqual(
    harness.queries.map((query) => query.offset),
    [0, 1, 2, 3],
  );
});

test("DB·인증 서버·환경 설정 실패는 내부 내용을 숨긴 503을 반환한다", async () => {
  const harnesses = [
    createHarness({
      fail: () => ({
        code: "secret-code",
        message: "private database details",
      }),
    }),
    createHarness({
      authError: { status: 503, message: "private auth details" },
    }),
    createHarness({ authError: new Error("private network details") }),
    createHarness({ env: false }),
  ];
  for (const harness of harnesses) {
    const response = await harness.list(request());
    assertPrivate(response, 503);
    const body = await response.json();
    assert.equal(body.error.code, "BOOKMARK_SERVICE_UNAVAILABLE");
    assert.ok(!JSON.stringify(body).includes("private"));
    assert.ok(!JSON.stringify(body).includes("secret"));
  }
});

test("중복 외 INSERT 실패와 DELETE 실패도 내부 오류 내용을 공개하지 않는다", async () => {
  for (const method of ["PUT", "DELETE"]) {
    const harness = createHarness({
      blogs: [{ id: 1 }],
      fail: (query) =>
        query.operation !== "select"
          ? { code: "42501", message: "private policy" }
          : null,
    });
    const response = await harness[method](
      request("/1", { method }),
      context(1),
    );
    assertPrivate(response, 503);
    assert.ok(!(await response.text()).includes("private policy"));
  }
});

test("예상하지 못한 예외도 내부 내용을 숨긴 500과 비공개 캐시 헤더를 반환한다", async () => {
  const harness = createHarness({
    fail: () => {
      throw new Error("private runtime detail");
    },
  });
  const response = await harness.list(request());
  assertPrivate(response, 500);
  const body = await response.json();
  assert.equal(body.error.code, "INTERNAL_ERROR");
  assert.ok(!JSON.stringify(body).includes("private runtime detail"));
});
