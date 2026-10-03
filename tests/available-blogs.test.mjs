import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

// 실제 조회·중복 제거·정렬 로직을 실행하고 Supabase만 메모리 데이터로 대체한다.
// 실제 환경 변수, 네트워크 및 DB 클라이언트에 접근하지 않는다.
function createHarness(rows, { serverCap = 1000, fail } = {}) {
  const requests = [];
  const errors = [];
  const supabase = {
    from(table) {
      assert.equal(table, "blogs");
      const request = { from: 0, to: Infinity };
      const query = {
        select(columns) {
          assert.equal(columns, "author, category");
          return query;
        },
        eq(column, value) {
          assert.equal(column, "blog_type");
          request.blogType = value;
          return query;
        },
        order(column, options) {
          request.order = { column, ascending: options.ascending };
          return query;
        },
        range(from, to) {
          request.from = from;
          request.to = to;
          return query;
        },
        then(resolve, reject) {
          return Promise.resolve()
            .then(() => {
              assert.ok(requests.length < 100, "페이지 조회가 종료되어야 한다");
              requests.push({ ...request });
              if (fail?.(request)) {
                return { data: null, error: { message: "synthetic API error" } };
              }
              const matching = rows.filter(
                (row) => row.blog_type === request.blogType,
              );
              if (request.order) {
                const { column, ascending } = request.order;
                matching.sort((a, b) =>
                  ascending ? a[column] - b[column] : b[column] - a[column],
                );
              }
              const count = Math.min(
                serverCap,
                request.to - request.from + 1,
              );
              return {
                data: matching
                  .slice(request.from, request.from + count)
                  .map(({ author, category }) => ({ author, category })),
                error: null,
              };
            })
            .then(resolve, reject);
        },
      };
      return query;
    },
  };
  const source = ts.transpileModule(
    readFileSync(new URL("../lib/supabase.ts", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports,
    require(name) {
      assert.equal(name, "@supabase/supabase-js");
      return { createClient: () => supabase };
    },
    process: { env: {} },
    console: { error: (...args) => errors.push(args) },
  });
  return { fetchAvailableBlogs: exports.fetchAvailableBlogs, requests, errors };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function row(id, author, blog_type = "company", category = null) {
  return { id, author, blog_type, category };
}

test("첫 1000개 이후의 신규 기업도 선택 목록에 포함한다", async () => {
  const rows = [
    ...Array.from({ length: 1000 }, (_, index) => row(index + 1, "토스")),
    row(1001, "NHN Cloud"),
    row(1002, "인프랩"),
    row(1003, "하이퍼엑셀"),
    row(1004, "한글과컴퓨터"),
  ].reverse();
  const harness = createHarness(rows);
  const result = plain(await harness.fetchAvailableBlogs());
  assert.deepEqual(result.companies.map(({ author }) => author), [
    "토스",
    ...["NHN Cloud", "인프랩", "하이퍼엑셀", "한글과컴퓨터"].sort((a, b) =>
      a.localeCompare(b),
    ),
  ]);
  assert.deepEqual(result.individuals, []);
  assert.deepEqual(
    harness.requests
      .filter(({ blogType }) => blogType === "company")
      .map(({ from }) => from),
    [0, 1000, 1004],
  );
  assert.ok(
    harness.requests.every(
      ({ order }) => order?.column === "id" && order.ascending === true,
    ),
  );
});

test("서버 한도가 요청보다 작아도 빈 페이지까지 읽고 기업·개인을 구분한다", async () => {
  const harness = createHarness(
    [
      row(1, "인프랩"),
      row(2, "토스"),
      row(3, "NHN Cloud"),
      row(4, "인프랩", "personal", "FE"),
      row(5, "개발자", "personal", "BE"),
      row(6, "인프랩", "personal", "AI"),
      row(7, "한글과컴퓨터"),
      row(8, "하이퍼엑셀"),
    ].reverse(),
    { serverCap: 2 },
  );
  const result = plain(await harness.fetchAvailableBlogs());
  assert.equal(result.companies.length, 5);
  assert.ok(result.companies.every(({ blog_type }) => blog_type === "company"));
  assert.deepEqual(result.individuals, [
    { author: "개발자", blog_type: "personal", category: "BE" },
    { author: "인프랩", blog_type: "personal", category: "AI" },
  ]);
  assert.deepEqual(
    harness.requests
      .filter(({ blogType }) => blogType === "company")
      .map(({ from }) => from),
    [0, 2, 4, 5],
  );
  assert.deepEqual(
    harness.requests
      .filter(({ blogType }) => blogType === "personal")
      .map(({ from }) => from),
    [0, 2, 3],
  );
});

for (const blogType of ["company", "personal"]) {
  test(`${blogType} 후속 페이지 API 실패 시 기존 빈 목록 반환 동작을 유지한다`, async () => {
    const harness = createHarness(
      [
        row(1, "토스"),
        row(2, "인프랩"),
        row(3, "한글과컴퓨터"),
        row(4, "개발자", "personal", "FE"),
        row(5, "작성자", "personal", "BE"),
        row(6, "새 작성자", "personal", "AI"),
      ],
      {
        serverCap: 2,
        fail: (request) => request.blogType === blogType && request.from === 2,
      },
    );
    assert.deepEqual(plain(await harness.fetchAvailableBlogs()), {
      companies: [],
      individuals: [],
    });
    assert.equal(harness.errors.length, 1);
    const label = blogType === "company" ? "기업" : "개인";
    assert.equal(
      harness.errors[0][1].message,
      `${label} 블로그 목록 조회 실패: synthetic API error`,
    );
  });
}
