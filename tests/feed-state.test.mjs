import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import React from "react";
import { act, create } from "react-test-renderer";
import ts from "typescript";
import * as tagData from "../lib/tag-data.js";

const require = createRequire(import.meta.url);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// 실제 React 훅을 실행하고 데이터 요청만 제어해 응답 순서를 재현한다.
function loadModule(file, mocks = {}) {
  const source = ts.transpileModule(
    readFileSync(new URL(file, import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2020,
      },
    },
  ).outputText;
  const exports = {};
  vm.runInNewContext(
    source,
    {
      exports,
      require: (name) => (name in mocks ? mocks[name] : require(name)),
      AbortController,
      URLSearchParams,
      console,
    },
    { filename: file },
  );
  return exports;
}

const tagFilters = loadModule("../lib/tag-filters.ts", {
  "./tag-data.js": tagData,
});
const defaults = {
  blogType: "company",
  selectedBlog: "all",
  sortBy: "published_at",
  searchQuery: "",
  tagCategory: "all",
  selectedSubTags: [],
};
const result = (ids, totalPages = 2) => ({
  blogs: ids.map((id) => ({ id })),
  totalCount: 24,
  totalPages,
});

async function mountFeed() {
  const requests = [];
  const { useInfiniteBlogData } = loadModule(
    "../hooks/use-infinite-blog-data.ts",
    {
      "@/lib/tag-filters": tagFilters,
      "@/lib/supabase": {
        fetchBlogs: (options) =>
          new Promise((resolve, reject) =>
            requests.push({ options, resolve, reject }),
          ),
      },
    },
  );
  let state;
  function Probe({ filters }) {
    state = useInfiniteBlogData(filters);
    return null;
  }
  let root;
  await act(async () => {
    root = create(React.createElement(Probe, { filters: defaults }));
  });
  return {
    requests,
    get state() {
      return state;
    },
    update: async (updates) =>
      act(async () => {
        root.update(
          React.createElement(Probe, { filters: { ...defaults, ...updates } }),
        );
      }),
    close: async () => act(async () => root.unmount()),
  };
}

function ids(state) {
  return Array.from(state.blogs, (blog) => blog.id);
}

test("늦은 이전 필터 응답이 새 결과를 덮어쓰지 않는다", async () => {
  const feed = await mountFeed();
  try {
    await feed.update({ searchQuery: "React" });
    assert.equal(feed.requests[0].options.signal.aborted, true);
    await act(async () => feed.requests[1].resolve(result([2])));
    await act(async () => feed.requests[0].resolve(result([1])));
    assert.deepEqual(ids(feed.state), [2]);
    assert.equal(feed.state.loading, false);
  } finally {
    await feed.close();
  }
});

test("중복 추가 요청을 막고 필터 변경 후 이전 페이지를 섞지 않는다", async () => {
  const feed = await mountFeed();
  try {
    await act(async () => feed.requests[0].resolve(result([1])));
    await act(async () => {
      void feed.state.loadMore();
      void feed.state.loadMore();
    });
    assert.equal(feed.requests.length, 2);
    await feed.update({ tagCategory: "frontend" });
    await act(async () => feed.requests[1].resolve(result([99])));
    assert.equal(feed.state.loading, true);
    assert.deepEqual(ids(feed.state), []);
    await act(async () => feed.requests[2].resolve(result([2])));
    assert.deepEqual(ids(feed.state), [2]);
  } finally {
    await feed.close();
  }
});

test("첫 요청 실패를 빈 결과와 구분하고 재시도할 수 있다", async () => {
  const feed = await mountFeed();
  try {
    await act(async () => feed.requests[0].reject(new Error("offline")));
    assert.ok(feed.state.error);
    assert.equal(feed.state.hasMore, false);
    await act(async () => feed.state.retry());
    await act(async () => feed.requests[1].resolve(result([5], 1)));
    assert.equal(feed.state.error, null);
    assert.deepEqual(ids(feed.state), [5]);
  } finally {
    await feed.close();
  }
});

test("추가 로딩 실패 시 기존 글을 유지하고 같은 페이지를 재시도한다", async () => {
  const feed = await mountFeed();
  try {
    await act(async () => feed.requests[0].resolve(result([1])));
    await act(async () => {
      void feed.state.loadMore();
    });
    await act(async () => feed.requests[1].reject(new Error("offline")));
    assert.ok(feed.state.loadMoreError);
    assert.deepEqual(ids(feed.state), [1]);
    await act(async () => {
      void feed.state.loadMore();
    });
    assert.equal(feed.requests[2].options.page, 2);
    await act(async () => feed.requests[2].resolve(result([1, 2])));
    assert.deepEqual(ids(feed.state), [1, 2]);
    assert.equal(feed.state.loadMoreError, null);
    assert.equal(feed.state.hasMore, false);
  } finally {
    await feed.close();
  }
});

test("화면 해제 시 진행 중인 요청을 취소한다", async () => {
  const feed = await mountFeed();
  await feed.close();
  assert.equal(feed.requests[0].options.signal.aborted, true);
});

test("카드 태그는 카테고리와 세부 태그를 URL 한 번으로 갱신한다", async () => {
  let params = new URLSearchParams(
    "tag=backend&subtags=backend&q=react&view=list",
  );
  const replacements = [];
  const { useUrlFilters } = loadModule("../hooks/use-url-filters.ts", {
    "@/lib/tag-filters": tagFilters,
    "next/navigation": {
      useRouter: () => ({ replace: (url) => replacements.push(url) }),
      useSearchParams: () => params,
    },
  });
  let filters;
  function Probe() {
    filters = useUrlFilters();
    return null;
  }
  let root;
  await act(async () => {
    root = create(React.createElement(Probe));
  });
  try {
    await act(async () => filters.handleTagClick("react"));
    assert.equal(replacements.length, 1);
    params = new URLSearchParams(replacements[0]);
    assert.equal(params.get("tag"), "frontend");
    assert.equal(params.get("subtags"), "react");
    assert.equal(params.get("q"), "react");
    assert.equal(params.get("view"), "list");
    await act(async () => root.update(React.createElement(Probe)));
    await act(async () => filters.handleTagClick("react"));
    assert.equal(new URLSearchParams(replacements[1]).has("subtags"), false);
    params = new URLSearchParams("tag=architecture&subtags=architecture");
    await act(async () => root.update(React.createElement(Probe)));
    await act(async () => filters.handleTagClick("architecture"));
    assert.equal(
      new URLSearchParams(replacements[2]).get("tag"),
      "architecture",
    );
    assert.equal(new URLSearchParams(replacements[2]).has("subtags"), false);
    await act(async () => filters.handleTagClick("case-study"));
    assert.equal(new URLSearchParams(replacements[3]).get("tag"), "else");
    assert.equal(
      new URLSearchParams(replacements[3]).get("subtags"),
      "case-study",
    );
  } finally {
    await act(async () => root.unmount());
  }
});

test("여러 카드가 인증을 사용해도 초기 조회와 구독은 한 번만 실행한다", async () => {
  let sessionCalls = 0;
  let subscriptions = 0;
  let unsubscribed = false;
  let callback;
  const profiles = [];
  const { AuthProvider, useAuth } = loadModule(
    "../components/auth/auth-provider.tsx",
    {
      "@/lib/supabase": {
        supabase: {
          auth: {
            getSession: async () => {
              sessionCalls++;
              return { data: { session: null } };
            },
            onAuthStateChange: (handler) => {
              callback = handler;
              subscriptions++;
              return {
                data: {
                  subscription: {
                    unsubscribe: () => {
                      unsubscribed = true;
                    },
                  },
                },
              };
            },
          },
        },
      },
      "@/lib/auth": {
        getUserProfile: async (id) => {
          profiles.push(id);
          return { id };
        },
        upsertUserProfile: async () => ({ profile: null, error: null }),
      },
      "@/hooks/use-toast": { useToast: () => ({ toast: () => {} }) },
    },
  );
  let auth;
  function Consumer() {
    auth = useAuth();
    return null;
  }
  let root;
  await act(async () => {
    root = create(
      React.createElement(
        AuthProvider,
        null,
        Array.from({ length: 12 }, (_, key) =>
          React.createElement(Consumer, { key }),
        ),
      ),
    );
  });
  try {
    assert.equal(sessionCalls, 1);
    assert.equal(subscriptions, 1);
    await act(async () => callback("SIGNED_IN", { user: { id: "reader" } }));
    assert.equal(auth.user.id, "reader");
    assert.deepEqual(profiles, ["reader"]);
    await act(async () => callback("SIGNED_OUT", null));
    assert.equal(auth.user, null);
    assert.equal(auth.profile, null);
  } finally {
    await act(async () => root.unmount());
  }
  assert.equal(unsubscribed, true);
});

test("북마크를 한 번에 조회하고 계정 전환 시 이전 결과를 버린다", async () => {
  let user = { id: "first" };
  const requests = [];
  const { BookmarkProvider, useBookmarks } = loadModule(
    "../components/bookmark-provider.tsx",
    {
      "@/hooks/use-auth": { useAuth: () => ({ user, loading: false }) },
      "@/lib/bookmarks": {
        getUserBookmarks: () =>
          new Promise((resolve) => requests.push(resolve)),
      },
      "@/lib/webview-bridge": { isFlutterWebView: () => false },
    },
  );
  let bookmarks;
  function Consumer() {
    bookmarks = useBookmarks();
    return null;
  }
  const tree = () =>
    React.createElement(
      BookmarkProvider,
      null,
      Array.from({ length: 12 }, (_, key) =>
        React.createElement(Consumer, { key }),
      ),
    );
  let root;
  await act(async () => {
    root = create(tree());
  });
  try {
    assert.equal(requests.length, 1);
    const previousAccountSetter = bookmarks.setBookmarked;
    user = { id: "second" };
    await act(async () => root.update(tree()));
    await act(async () =>
      requests[1]({ bookmarks: [{ blog_id: 2 }], error: null }),
    );
    await act(async () =>
      requests[0]({ bookmarks: [{ blog_id: 1 }], error: null }),
    );
    await act(async () => previousAccountSetter(99, true));
    assert.deepEqual(Array.from(bookmarks.ids), [2]);
    await act(async () => bookmarks.setBookmarked(3, true));
    assert.deepEqual(Array.from(bookmarks.ids), [2, 3]);
    user = null;
    await act(async () => root.update(tree()));
    assert.equal(bookmarks.ids.size, 0);
  } finally {
    await act(async () => root.unmount());
  }
});
