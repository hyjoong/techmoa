import assert from "node:assert/strict";
import { test } from "node:test";
import Parser from "rss-parser";
import { createSummary } from "../scripts/rss/summary.js";

const nhn = { name: "NHN Cloud", url: "https://meetup.nhncloud.com/rss" };

// 저장된 NHN RSS의 실제 description 도입부. 외부 RSS 요청 없이 파싱한다.
const description = `[![NHN Cloud_meetup banner_quantum-era-cryptography_202608_900.png](https://image.toast.com/aaaadh/real/2026/techblog/NHN%20Cloudmeetup%20bannerquantumeracryptography202608900.png)](https://www.nhncloud.com/kr)

## 들어가며

현재 웹 통신의 대부분은 HTTPS 프로토콜을 사용하고 있습니다. HTTPS는 TLS(Transport Layer Security) 위에서 동작하며, 주로 RSA나 ECDH 알고리즘으로 키를 교환하고 AES로 데이터를 암호화합니다. 과거 HTTP 시절에는 데이터가 평문으로 전송됐지만, 지금은 중간에서 패킷을 가로채더라도 내용을 알 수 없습니다. 도청은 사실상 불가능하다고 알려져 있습니다.`;

test("실제 NHN RSS의 연결된 배너를 제외하고 원문 본문을 200자로 요약한다", async () => {
  const feed = await new Parser().parseString(
    `<rss version="2.0"><channel><title>NHN Cloud Meetup</title><item><title>양자 시대를 대비하는 개발자의 암호학 가이드(PQC-ML-KEM)</title><description><![CDATA[${description}]]></description></item></channel></rss>`,
  );
  const item = feed.items[0];
  item.contentSnippet = item.contentSnippet.slice(0, 150);
  const summary = createSummary(item.contentSnippet, nhn, item);
  const body = description.split("## 들어가며\n\n")[1];
  assert.equal(summary, body.slice(0, 200) + "...");
  assert.doesNotMatch(summary, /https?:|image\.toast|banner|\[|\]|들어가며/);
});

test("NHN 이미지 URL의 괄호를 처리하고 일반 링크의 본문은 보존한다", () => {
  const source = `[![배너](https://image.toast.com/banner(1).png)](https://www.nhncloud.com/kr)
![본문 그림](https://image.toast.com/diagram(2).png)
## 문서 제목
> **ClickHouse**는 [컬럼 기반 저장소](https://example.com/docs(overview))입니다.
- \`query_id\`와 _메타데이터_를 함께 확인합니다.
\`\`\`sql
SELECT image_url FROM logs;
\`\`\`
<p>HTML <a href="https://example.com">링크</a>도 <strong>유지</strong>합니다.<br>예시 &amp; 설명입니다.</p>`;
  assert.equal(
    createSummary(source, nhn, { content: source }),
    "ClickHouse는 컬럼 기반 저장소입니다. query_id와 메타데이터를 함께 확인합니다. HTML 링크도 유지합니다. 예시 & 설명입니다.",
  );
});

test("NHN 원문 소스 우선순위와 배너만 있는 소스의 후순위 본문을 보존한다", () => {
  const banner =
    "[![배너](https://example.com/banner.png)](https://example.com)";
  assert.equal(
    createSummary("잘린 요약", nhn, {
      "content:encoded": `${banner}\n원문 전체를 먼저 사용합니다.`,
      content: "다른 본문입니다.",
      contentSnippet: "잘린 요약",
    }),
    "원문 전체를 먼저 사용합니다.",
  );
  assert.equal(
    createSummary(banner, nhn, {
      "content:encoded": banner,
      content: banner,
      description: "배너를 제외한 설명을 사용합니다.",
      contentSnippet: banner,
    }),
    "배너를 제외한 설명을 사용합니다.",
  );
  assert.equal(createSummary(banner, nhn, { content: banner }), "");
});

test("다른 HTML 피드와 Markdown 없는 NHN 피드는 기존 요약을 유지한다", () => {
  const html = "<p>첫 <strong>문단</strong>입니다.</p><p>둘째 문단입니다.</p>";
  const expected = "첫 문단입니다.둘째 문단입니다.";
  assert.equal(
    createSummary(html, { url: "https://example.com/rss" }),
    expected,
  );
  assert.equal(createSummary(html, nhn, { content: html }), expected);
  assert.equal(createSummary(""), "");
  assert.equal(createSummary("가".repeat(220)), "가".repeat(200) + "...");
  assert.equal(
    createSummary("**다른 피드** [링크](https://example.com)", {
      url: "https://example.com/rss",
    }),
    "**다른 피드** [링크](https://example.com)",
  );
});

test("Medium은 snippet 우선순위와 subtitle 추출을 유지한다", () => {
  const medium = { url: "https://medium.com/feed/example" };
  const encoded =
    '<h3 class="subtitle">Medium의 설명 문장을 보존합니다.</h3><p>첫 번째 본문도 충분히 긴 문장입니다.</p>';
  assert.equal(
    createSummary("무시되는 입력", medium, {
      contentSnippet: "Medium에서 제공한 요약을 먼저 사용합니다.",
      "content:encoded": encoded,
    }),
    "Medium에서 제공한 요약을 먼저 사용합니다.",
  );
  assert.equal(
    createSummary("무시되는 입력", medium, { "content:encoded": encoded }),
    "Medium의 설명 문장을 보존합니다.",
  );
});
