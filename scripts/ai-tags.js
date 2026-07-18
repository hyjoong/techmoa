import dotenv from "dotenv";
import { ALL_FILTER_TAGS } from "../lib/tag-data.js";

dotenv.config();

const FIREWORKS_API_KEY = process.env.FIREWORKS_API_KEY;
const FIREWORKS_MODEL =
  process.env.FIREWORKS_MODEL ||
  "accounts/fireworks/models/deepseek-v3p1-terminus";
let warnedMissingKey = false;
const RETRY_STATUSES = [429, 500, 502, 503, 504];
const RETRY_BASE_MS = parseInt(process.env.TAG_RETRY_BASE_MS || "5000", 10); // 기본 5초
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 태그 후보는 UI 필터 카테고리(lib/tag-data.js)와 동일한 목록에서 파생
const ALLOWED_TAGS = ALL_FILTER_TAGS;

export const mergeAndDedupe = (tags) => {
  const normalized = tags
    .filter(Boolean)
    .map((tag) => tag.toString().toLowerCase().trim())
    .filter((tag) => tag.length > 0);
  return Array.from(new Set(normalized));
};

const parseTagsFromText = (text) => {
  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return mergeAndDedupe(parsed);
    }
  } catch {
    // Fall back to comma/newline parsing for models that do not return JSON.
  }

  // 쉼표/줄바꿈 기준 분리
  const parts = text
    .replace(/[\[\]]/g, "")
    .split(/[,\n]/)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  return mergeAndDedupe(parts);
};

const buildPrompt = ({ title, summary = "", author = "" }) => {
  const allowed = ALLOWED_TAGS.join(", ");
  return `
Rules:
- Use ONLY tags from this allowed list: ${allowed}
- Respond as a JSON array of strings only. No prose, no markdown.
- Prefer broader tags if unsure.
- Developer retrospectives (회고), career reflections, and dev culture posts ARE tech topics: use "career" or "culture".
- If the article IS about software/tech, always return at least one tag (pick the closest broader one).
- Only if the article is NOT about software/tech topics at all (e.g. workout log, travel diary, daily life, personal errands), respond with an empty array [].

Article:
- Title: ${title}
- Author/Blog: ${author}
- Summary: ${summary}
`.trim();
};

async function generateWithFireworks(prompt) {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(
      "https://api.fireworks.ai/inference/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${FIREWORKS_API_KEY}`,
        },
        body: JSON.stringify({
          model: FIREWORKS_MODEL,
          messages: [
            {
              role: "system",
              content:
                "You are a tag extraction function. Output only a JSON array of strings. No reasoning.",
            },
            { role: "user", content: prompt },
          ],
          temperature: 0,
          max_tokens: 256,
          reasoning_effort: "low",
        }),
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data?.choices?.[0]?.message?.content || "";
    }

    const body = await response.text();
    if (RETRY_STATUSES.includes(response.status) && attempt < maxAttempts) {
      const delayMs = RETRY_BASE_MS * attempt;
      console.warn(
        `⚠️ Fireworks 응답 ${response.status}, ${delayMs}ms 후 재시도 (${attempt}/${maxAttempts})`
      );
      await sleep(delayMs);
      continue;
    }

    throw new Error(`Fireworks 요청 실패 (status=${response.status}): ${body}`);
  }
}

// 태그와 함께 판정 상태를 반환한다.
// nonTech는 status "ok"에서 모델이 비기술 글로 판단(원본 응답 빈 배열)했을 때만 true.
// "unavailable"/"error"는 판정 자체가 불가능했던 경우라 nonTech를 세우지 않는다.
export async function classifyArticleTags(article) {
  if (!FIREWORKS_API_KEY) {
    if (!warnedMissingKey) {
      console.warn(
        "⚠️ FIREWORKS_API_KEY가 설정되지 않아 태그 생성을 건너뜁니다."
      );
      warnedMissingKey = true;
    }
    return { status: "unavailable", tags: [], nonTech: false };
  }

  try {
    const prompt = buildPrompt({
      title: article.title || "",
      summary: article.summary || "",
      author: article.author || "",
    });

    const text = await generateWithFireworks(prompt);
    const parsedTags = parseTagsFromText(text);

    // 허용 태그만 필터링 후 상위 몇 개만 사용
    const filtered = parsedTags.filter((tag) => ALLOWED_TAGS.includes(tag));
    const tags = mergeAndDedupe(filtered).slice(0, 6);

    // nonTech는 모델의 원본 응답 자체가 빈 배열일 때만 true.
    // 허용 목록 밖 태그를 골라 사후 필터링으로 비워진 경우는 기술 글로 취급해야 한다.
    return { status: "ok", tags, nonTech: parsedTags.length === 0 };
  } catch (error) {
    console.error("❌ 태그 생성 중 오류:", error.message);
    return { status: "error", tags: [], nonTech: false };
  }
}

export async function generateTagsForArticle(article) {
  const { tags } = await classifyArticleTags(article);
  return tags;
}

// FE/BE/AI 등 기존 feed 카테고리를 태그로 매핑
export function baseTagsFromFeedCategory(category) {
  if (!category) return [];
  const key = category.toString().toUpperCase();
  switch (key) {
    case "FE":
      return ["frontend", "web"];
    case "BE":
      return ["backend"];
    case "AI":
      return ["ai"];
    case "APP":
      return ["mobile"];
    default:
      return [];
  }
}
