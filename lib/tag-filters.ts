import { TAG_FILTER_OPTIONS as TAG_FILTER_DATA } from "./tag-data.js";

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
// 태그 목록의 단일 소스는 lib/tag-data.js (AI 태그 생성과 공유)
export const TAG_FILTER_OPTIONS = TAG_FILTER_DATA as TagFilterOption[];

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
