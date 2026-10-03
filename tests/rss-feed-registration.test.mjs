import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { RSS_FEEDS } from "../scripts/rss/feeds.js";

// 클라우드 커밋 9e30d78의 승인된 등록 정보를 복구한 목록이다.
// 정적 설정만 읽으며 RSS 요청, DB, AI, 알림 모듈은 로드하지 않는다.
const additions = [
  ["인프랩", "https://tech.inflab.com/rss.xml", "company", null],
  ["NHN Cloud", "https://meetup.nhncloud.com/rss", "company", null],
  ["하이퍼엑셀", "https://hyper-accel.github.io/index.xml", "company", null],
  ["한글과컴퓨터", "https://tech.hancom.com/feed/", "company", null],
  ["김용찬", "https://yceffort.kr/feed.xml", "personal", "FE"],
  ["민은영", "https://danbom425.tistory.com/rss", "personal", "FE"],
  ["서대영", "https://www.daleseo.com/rss.xml", "personal", "BE"],
  ["김찬희", "https://v2.velog.io/rss/superlipbalm", "personal", "FE"],
  ["김남윤", "https://cheese10yun.github.io/rss2.xml", "personal", "BE"],
  [
    "변정훈",
    "https://feeds.feedburner.com/rss_outsider_dev?format=xml",
    "personal",
    "BE",
  ],
];

test("승인된 10개 피드의 작성자 키와 유형·카테고리를 보존한다", () => {
  for (const [name, url, type, category] of additions) {
    const feed = RSS_FEEDS.find((entry) => entry.name === name);
    assert.ok(feed, `${name} 피드가 없습니다.`);
    assert.deepEqual(
      [feed.url, feed.type, feed.category ?? null],
      [url, type, category],
      `${name}의 승인된 설정이 달라졌습니다.`,
    );
  }
});

test("등록 이름과 URL이 중복되지 않고 기업·개인 유형이 유효하다", () => {
  assert.equal(
    new Set(RSS_FEEDS.map((feed) => feed.name)).size,
    RSS_FEEDS.length,
  );
  assert.equal(
    new Set(RSS_FEEDS.map((feed) => feed.url)).size,
    RSS_FEEDS.length,
  );
  for (const feed of RSS_FEEDS) {
    assert.ok(["company", "personal"].includes(feed.type), feed.name);
    assert.equal(new URL(feed.url).protocol, "https:", feed.name);
    if (feed.type === "personal") {
      assert.ok(["FE", "BE", "AI", "APP"].includes(feed.category), feed.name);
    }
  }
});

test("신규 기업 작성자 키가 실제 로컬 로고 파일에 연결된다", () => {
  const source = readFileSync(
    new URL("../lib/logos.ts", import.meta.url),
    "utf8",
  );
  const logoEntries = Array.from(
    source.matchAll(/^\s*(?:"([^"]+)"|([^\s:"{}]+)):\s*"(\/logos\/[^"\n]+)"/gm),
    (match) => [match[1] ?? match[2], match[3]],
  );
  const logos = new Map(logoEntries);
  for (const [name, , type] of additions) {
    if (type !== "company") continue;
    const path = logos.get(name);
    assert.ok(path, `${name} 로고 매핑이 없습니다.`);
    assert.ok(
      existsSync(new URL(`../public${path}`, import.meta.url)),
      `${name} 로고 파일이 없습니다.`,
    );
  }
});
