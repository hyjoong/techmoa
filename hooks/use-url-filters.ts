"use client";

import { useRouter, useSearchParams } from "next/navigation";

export type BlogType = "company" | "personal";
export type SortBy = "published_at" | "title" | "views";
export type ViewMode = "gallery" | "list";

export interface UrlFilters {
  blogType: BlogType;
  selectedBlog: string;
  currentPage: number;
  sortBy: SortBy;
  viewMode: ViewMode;
}

export interface UrlFiltersActions {
  updateURL: (updates: Record<string, string | number | null>) => void;
  handleBlogTypeChange: (newType: BlogType) => void;
  handleBlogChange: (newBlog: string) => void;
  handlePageChange: (page: number) => void;
  handleViewModeChange: (mode: ViewMode) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

export function useUrlFilters(): UrlFilters & UrlFiltersActions {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 쿼리스트링에서 상태 읽기
  const blogType = (searchParams.get("type") as BlogType) || "company";
  const selectedBlog = searchParams.get("blog") || "all";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);
  const sortBy = (searchParams.get("sort") as SortBy) || "published_at";
  const viewMode = (searchParams.get("view") as ViewMode) || "gallery";

  // URL 업데이트 함수
  const updateURL = (updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (
        value === null ||
        value === "" ||
        (key === "type" && value === "company") ||
        (key === "blog" && value === "all") ||
        (key === "page" && value === 1) ||
        (key === "sort" && value === "published_at") ||
        (key === "view" && value === "gallery")
      ) {
        params.delete(key);
      } else {
        params.set(key, value.toString());
      }
    });

    const newURL = params.toString() ? `?${params.toString()}` : "/";
    router.replace(newURL, { scroll: false });
  };

  // 블로그 타입 변경 핸들러
  const handleBlogTypeChange = (newType: BlogType) => {
    updateURL({ type: newType, blog: "all", page: 1, view: viewMode });
  };

  // 블로그 선택 변경 핸들러
  const handleBlogChange = (newBlog: string) => {
    updateURL({ blog: newBlog, page: 1, view: viewMode });
  };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    updateURL({ page });
  };

  // 뷰 모드 변경 핸들러
  const handleViewModeChange = (mode: ViewMode) => {
    updateURL({ view: mode });
  };

  // 필터 초기화
  const clearFilters = () => {
    updateURL({ type: "company", blog: "all", page: 1 });
  };

  // 활성 필터 확인
  const hasActiveFilters = blogType !== "company" || selectedBlog !== "all";

  return {
    // 상태
    blogType,
    selectedBlog,
    currentPage,
    sortBy,
    viewMode,
    // 액션
    updateURL,
    handleBlogTypeChange,
    handleBlogChange,
    handlePageChange,
    handleViewModeChange,
    clearFilters,
    hasActiveFilters,
  };
}
