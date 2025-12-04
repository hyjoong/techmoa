export type TagCategory =
  | "all"
  | "frontend"
  | "backend"
  | "ai"
  | "devops"
  | "architecture"
  | "else";

interface TagFilterOption {
  id: TagCategory;
  label: string;
  tags: string[];
}

// 굵직한 태그 카테고리를 미리 정의해 라디오 버튼처럼 선택하도록 사용
// 실제 DB 태그 사용 빈도 기반으로 구성 (2025-12 기준)
// 각 카테고리는 관련된 모든 태그를 포함 (백엔드 관련, 프론트엔드 관련 등)
export const TAG_FILTER_OPTIONS: TagFilterOption[] = [
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

export const getTagsForCategory = (
  category: TagCategory,
  selectedSubTags?: string[]
): string[] | undefined => {
  // "all" 카테고리면 undefined 반환 (필터링 안함)
  if (category === "all") {
    return undefined;
  }

  const option = TAG_FILTER_OPTIONS.find((opt) => opt.id === category);
  const allTags = option?.tags ?? [];

  // 서브태그가 선택되었으면 해당 태그만 반환
  if (selectedSubTags && selectedSubTags.length > 0) {
    return selectedSubTags;
  }

  // 선택 안되었으면 전체 태그 반환 (빈 배열이면 undefined)
  return allTags.length > 0 ? allTags : undefined;
};
