import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function createHarness({ html = "", error } = {}) {
  const calls = [];
  const source = ts.transpileModule(
    readFileSync(
      new URL("../scripts/rss/thumbnail.js", import.meta.url),
      "utf8",
    ),
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
    URL,
    console: { log() {} },
    require(name) {
      assert.equal(name, "./http.js");
      return {
        fetchTextWithTimeout: async (url, options) => {
          calls.push({ url, options });
          if (error) throw error;
          return html;
        },
      };
    },
  });
  return { ...exports, calls };
}

test("웹 썸네일은 제한 시간 있는 공통 전송에서 OG 이미지를 추출한다", async () => {
  const harness = createHarness({
    html: '<meta property="og:image" content="https://example.com/cover.png">',
  });
  const image = await harness.extractThumbnail({
    link: "https://toss.tech/article",
  });
  assert.equal(image, "https://example.com/cover.png");
  assert.equal(harness.calls.length, 1);
  assert.equal(
    harness.calls[0].options.headers["User-Agent"],
    "Techmoa RSS Reader (+https://techmoa.dev)",
  );
});

test("웹 오류나 시간 초과는 RSS 원본 이미지로 복구한다", async () => {
  for (const message of [
    "HTTP 403",
    "HTTP 요청 또는 본문 읽기가 10000ms를 초과했습니다.",
  ]) {
    const harness = createHarness({ error: new Error(message) });
    const image = await harness.extractThumbnail({
      link: "https://toss.tech/article",
      enclosure: {
        type: "image/png",
        url: "https://example.com/rss-cover.png",
      },
    });
    assert.equal(image, "https://example.com/rss-cover.png");
    assert.equal(harness.calls.length, 1);
  }
});

test("웹 요청 대상이 아닌 RSS 이미지는 네트워크 없이 추출한다", async () => {
  const harness = createHarness();
  const image = await harness.extractThumbnail({
    link: "https://example.com/article",
    "content:encoded": '<img src="/cover.png">',
  });
  assert.equal(image, "https://example.com/cover.png");
  assert.equal(harness.calls.length, 0);
});
