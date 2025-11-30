import dotenv from "dotenv";

dotenv.config();

const FIREWORKS_API_KEY = process.env.FIREWORKS_API_KEY;
const FIREWORKS_MODEL =
  process.env.FIREWORKS_MODEL ||
  "accounts/fireworks/models/deepseek-v3p1-terminus";
let warnedMissingKey = false;
const RETRY_STATUSES = [429, 500, 502, 503, 504];
const RETRY_BASE_MS = parseInt(process.env.TAG_RETRY_BASE_MS || "5000", 10); // 기본 5초
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 태그 후보는 서비스 전체에서 사용하는 굵직한 것들 위주로 제한
// lib/tag-filters.ts의 TAG_FILTER_OPTIONS와 동기화됨
const ALLOWED_TAGS = [
  // Frontend
  "frontend",
  "react",
  "nextjs",
  "javascript",
  "typescript",
  "css",
  "web",
  "ui/ux",
  "design",
  // Backend
  "backend",
  "nodejs",
  "nestjs",
  "spring",
  "java",
  "python",
  "go",
  "api",
  "database",
  // AI
  "ai",
  "ai-ml",
  "llm",
  "genai",
  "mlops",
  "nlp",
  "cv",
  // DevOps
  "devops",
  "kubernetes",
  "docker",
  "terraform",
  "monitoring",
  "logging",
  "sre",
  "cloud",
  "cicd",
  // Architecture
  "architecture",
  "scalability",
  "micro frontend",
  "monorepo",
  "module federation",
  "system design",
  // Else
  "career",
  "culture",
  "business",
  "product",
  "ad",
  "case-study",
];

const mergeAndDedupe = (tags) => {
  const normalized = tags
    .filter(Boolean)
    .map((tag) => tag.toString().toLowerCase().trim())
    .filter((tag) => tag.length > 0);
  return Array.from(new Set(normalized));
};

const parseTagsFromText = (text) => {
  if (!text) return [];
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
You are a concise tagger for a tech blog aggregator. Choose 3-6 tags that best describe the article.

Rules:
- Use ONLY tags from this allowed list: ${allowed}
- Respond as a comma-separated list only. No prose, no markdown.
- Prefer broader tags if unsure.

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
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          max_tokens: 64,
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

  throw new Error("Fireworks 요청이 반복 실패했습니다.");
}

export async function generateTagsForArticle(article) {
  if (!FIREWORKS_API_KEY) {
    if (!warnedMissingKey) {
      console.warn(
        "⚠️ FIREWORKS_API_KEY가 설정되지 않아 태그 생성을 건너뜁니다."
      );
      warnedMissingKey = true;
    }
    return [];
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
    const result = mergeAndDedupe(filtered).slice(0, 6);
    return result;
  } catch (error) {
    console.error("❌ 태그 생성 중 오류:", error.message);
    return [];
  }
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
