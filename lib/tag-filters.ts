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
export const TAG_FILTER_OPTIONS: TagFilterOption[] = [
  { id: "all", label: "All", tags: [] },
  {
    id: "frontend",
    label: "Frontend",
    tags: [
      "frontend",
      "react",
      "nextjs",
      "javascript",
      "typescript",
      "css",
      "web",
      "ui/ux",
      "design",
    ],
  },
  {
    id: "backend",
    label: "Backend",
    tags: [
      "backend",
      "nodejs",
      "nestjs",
      "spring",
      "java",
      "python",
      "go",
      "api",
      "database",
      "architecture",
    ],
  },
  {
    id: "ai",
    label: "AI",
    tags: ["ai", "ai-ml", "llm", "genai", "mlops", "nlp", "cv"],
  },
  {
    id: "devops",
    label: "DevOps",
    tags: [
      "devops",
      "kubernetes",
      "docker",
      "terraform",
      "monitoring",
      "logging",
      "sre",
      "cloud",
      "cicd",
    ],
  },
  {
    id: "architecture",
    label: "Architecture",
    tags: [
      "architecture",
      "scalability",
      "micro frontend",
      "monorepo",
      "module federation",
      "system design",
    ],
  },
  {
    id: "else",
    label: "Else",
    tags: ["career", "culture", "business", "product", "ad", "case-study"],
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
