import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import React from "react";
import { act, create } from "react-test-renderer";
import ts from "typescript";

const require = createRequire(import.meta.url);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

async function mountPage() {
  let user = { id: "reader-a" };
  const requests = [];
  const exports = {};
  const passthrough =
    (tag) =>
    ({ children, ...props }) =>
      React.createElement(tag, props, children);
  const mocks = {
    "@/hooks/use-auth": {
      useAuth: () => ({ user, isAuthenticated: !!user, loading: false }),
    },
    "@/lib/bookmarks": {
      getBookmarkedBlogs: (signal) =>
        new Promise((resolve, reject) =>
          requests.push({ signal, resolve, reject }),
        ),
    },
    "@/components/blog-card": {
      BlogCard: ({ blog }) => React.createElement("p", null, blog.title),
    },
    "@/components/blog-list-item": {
      BlogListItem: ({ blog }) => React.createElement("p", null, blog.title),
    },
    "@/components/bookmark-skeleton": {
      BookmarkSkeleton: () => React.createElement("p", null, "loading"),
    },
    "@/components/search-bar": { SearchBar: () => null },
    "next/link": { __esModule: true, default: passthrough("a") },
    "@/components/ui/button": { Button: passthrough("button") },
    "@/components/ui/card": {
      Card: passthrough("section"),
      CardContent: passthrough("div"),
    },
  };
  const source = ts.transpileModule(
    readFileSync(new URL("../app/bookmarks/page.tsx", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        target: ts.ScriptTarget.ES2020,
      },
    },
  ).outputText;
  vm.runInNewContext(source, {
    exports,
    require: (name) => (name in mocks ? mocks[name] : require(name)),
    AbortController,
    console,
  });
  let root;
  await act(async () => {
    root = create(React.createElement(exports.default));
  });
  return {
    requests,
    root,
    text: () => JSON.stringify(root.toJSON()),
    setUser: async (nextUser) => {
      user = nextUser;
      await act(async () => root.update(React.createElement(exports.default)));
    },
    close: async () => act(async () => root.unmount()),
  };
}

const result = (title) => ({
  blogs: [
    { id: 1, title, published_at: "2026-10-01", created_at: "2026-10-01" },
  ],
  error: null,
});

test("북마크 페이지는 계정 전환 후 늦게 도착한 이전 계정 응답을 버린다", async () => {
  const page = await mountPage();
  try {
    await page.setUser({ id: "reader-b" });
    assert.equal(page.requests[0].signal.aborted, true);
    await act(async () => page.requests[1].resolve(result("B의 글")));
    await act(async () => page.requests[0].resolve(result("A의 글")));
    assert.match(page.text(), /B의 글/);
    assert.doesNotMatch(page.text(), /A의 글/);
    await page.setUser(null);
    assert.doesNotMatch(page.text(), /B의 글/);
    assert.match(page.text(), /로그인하여/);
  } finally {
    await page.close();
  }
});

test("조회 실패는 빈 목록과 구분하며 다시 시도하면 복구된다", async () => {
  const page = await mountPage();
  try {
    await act(async () =>
      page.requests[0].resolve({
        blogs: [],
        error: { message: "서버 연결 실패" },
      }),
    );
    assert.match(page.text(), /서버 연결 실패/);
    assert.doesNotMatch(page.text(), /북마크된 글이 없습니다/);
    const retryButton = page.root.root
      .findAllByType("button")
      .find((button) => button.props.children === "다시 시도");
    await act(async () => retryButton.props.onClick());
    await act(async () => page.requests[1].resolve(result("복구된 글")));
    assert.match(page.text(), /복구된 글/);
    assert.doesNotMatch(page.text(), /서버 연결 실패/);
  } finally {
    await page.close();
  }
});
