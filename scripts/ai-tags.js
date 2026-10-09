import dotenv from "dotenv";
import { ALL_FILTER_TAGS } from "../lib/tag-data.js";

dotenv.config();

const FIREWORKS_API_KEY = process.env.FIREWORKS_API_KEY;
const FIREWORKS_MODEL =
  process.env.FIREWORKS_MODEL || "accounts/fireworks/models/gpt-oss-120b";
let warnedMissingKey = false;
const RETRY_STATUSES = [429, 500, 502, 503, 504];
const RETRY_BASE_MS = parseInt(process.env.TAG_RETRY_BASE_MS || "5000", 10); // 기본 5초
const REQUEST_TIMEOUT_MS = 30000;
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
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("태그 응답이 올바른 JSON 배열이 아닙니다.");
  }
  if (
    !Array.isArray(parsed) ||
    parsed.some((tag) => typeof tag !== "string" || !tag.trim())
  ) {
    throw new Error("태그 응답은 비어 있지 않은 문자열의 배열이어야 합니다.");
  }
  return mergeAndDedupe(parsed);
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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response;
    let retryStatus;
    try {
      response = await fetch(
        "https://api.fireworks.ai/inference/v1/chat/completions",
        {
          method: "POST",
          signal: controller.signal,
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
            max_tokens: 2048,
            reasoning_effort: "low",
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "article_tags",
                schema: {
                  type: "array",
                  items: { type: "string", enum: ALLOWED_TAGS },
                  maxItems: 6,
                },
              },
            },
          }),
        },
      );
      if (response.ok) {
        const data = await response.json();
        const choice = data?.choices?.[0];
        if (choice?.finish_reason !== "stop") {
          throw new Error("태그 응답이 정상적으로 완료되지 않았습니다.");
        }
        const content = choice.message?.content;
        if (typeof content !== "string" || !content.trim()) {
          throw new Error("태그 응답 본문이 비어 있습니다.");
        }
        return content;
      }
      const body = await response.text();
      if (RETRY_STATUSES.includes(response.status) && attempt < maxAttempts) {
        retryStatus = response.status;
      } else {
        throw new Error(
          `Fireworks 요청 실패 (status=${response.status}): ${body}`,
        );
      }
    } catch (error) {
      if (controller.signal.aborted) {
        throw new Error("Fireworks 요청이 30초 시간 제한을 초과했습니다.");
      }
      throw error;
    } finally {
      clearTimeout(timer);
      controller.abort();
      if (response?.body && !response.body.locked) {
        await response.body.cancel().catch(() => {});
      }
    }
    if (retryStatus) {
      const delayMs = RETRY_BASE_MS * attempt;
      console.warn(
        `⚠️ Fireworks 응답 ${retryStatus}, ${delayMs}ms 후 재시도 (${attempt}/${maxAttempts})`,
      );
      await sleep(delayMs);
    }
  }
}

// 태그와 함께 판정 상태를 반환한다.
// nonTech는 status "ok"에서 모델이 비기술 글로 판단(원본 응답 빈 배열)했을 때만 true.
// "unavailable"/"error"는 판정 자체가 불가능했던 경우라 nonTech를 세우지 않는다.
export async function classifyArticleTags(article) {
  if (!FIREWORKS_API_KEY) {
    if (!warnedMissingKey) {
      console.warn(
        "⚠️ FIREWORKS_API_KEY가 설정되지 않아 태그 생성을 건너뜁니다.",
      );
      warnedMissingKey = true;
    }
    return {
      status: "unavailable",
      tags: [],
      nonTech: false,
      error: "AI API 키가 설정되지 않았습니다.",
    };
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
    if (parsedTags.length > 0 && tags.length === 0) {
      throw new Error("태그 응답에 허용된 태그가 없습니다.");
    }

    // nonTech는 모델의 원본 응답 자체가 빈 배열일 때만 true.
    // 잘못된 응답이나 허용 목록 밖 태그는 실패로 보고하고 수집 제외에 사용하지 않는다.
    return { status: "ok", tags, nonTech: parsedTags.length === 0 };
  } catch (error) {
    console.error("❌ 태그 생성 중 오류:", error.message);
    return { status: "error", tags: [], nonTech: false, error: error.message };
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
