// 태그 카테고리의 단일 소스.
// UI 필터(lib/tag-filters.ts)와 AI 태그 생성(scripts/ai-tags.js)이 모두 이 파일에서 파생되므로
// 태그 추가/삭제는 반드시 여기서만 한다. (플레인 JS인 이유: 크롤러 스크립트가 node ESM으로 직접 import)
export const TAG_FILTER_OPTIONS = [
  { id: "all", label: "All", tags: [] },
  {
    id: "frontend",
    label: "Frontend",
    tags: [
      "frontend", // 124개
      "web", // 101개
      "design", // 81개
      "javascript", // 40개
      "ui/ux", // 30개
      "react", // 22개
      "typescript", // 20개
      "nextjs", // 10개
      "css", // 1개
      "micro frontend", // 3개
      "module federation", // 1개
    ],
  },
  {
    id: "backend",
    label: "Backend",
    tags: [
      "backend", // 124개
      "architecture", // 128개 - 백엔드 아키텍처
      "database", // 36개
      "api", // 24개
      "performance", // 59개 - 백엔드 성능
      "scalability", // 50개 - 백엔드 확장성
      "system design", // 43개 - 백엔드 시스템 설계
      "monorepo", // 6개
    ],
  },
  {
    id: "ai",
    label: "AI",
    tags: [
      "ai", // 50개
      "ai-ml", // 15개
      "llm", // 11개
      "genai", // 10개
      "mlops", // 6개
    ],
  },
  {
    id: "devops",
    label: "DevOps",
    tags: [
      "devops", // 62개
      "monitoring", // 54개
      "cloud", // 35개
      "cicd", // 16개
      "logging", // 15개
      "kubernetes", // 12개
      "sre", // 11개
      "docker", // 5개
      "terraform", // 1개
    ],
  },
  {
    id: "architecture",
    label: "Architecture",
    tags: [
      "architecture", // 128개
      "scalability", // 50개
      "performance", // 59개
      "system design", // 43개
      "monorepo", // 6개
      "micro frontend", // 3개
      "module federation", // 1개
    ],
  },
  {
    id: "else",
    label: "Else",
    tags: [
      "culture", // 128개
      "product", // 119개
      "career", // 96개
      "mobile", // 35개
      "testing", // 29개
      "security", // 15개
      "android", // 10개
      "ios", // 7개
      "kotlin", // 6개
      "swift", // 2개
    ],
  },
];

// 모든 카테고리 태그를 평탄화한 목록 (중복 제거)
export const ALL_FILTER_TAGS = Array.from(
  new Set(TAG_FILTER_OPTIONS.flatMap((option) => option.tags))
);
