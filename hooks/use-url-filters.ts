"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { TagCategory } from "@/lib/tag-filters";
export type { TagCategory } from "@/lib/tag-filters";

export type BlogType = "company" | "personal";
export type SortBy = "published_at" | "title" | "views";
export type ViewMode = "gallery" | "list";

export interface UrlFilters {
  blogType: BlogType;
  selectedBlog: string;
  currentPage: number;
  sortBy: SortBy;
  viewMode: ViewMode;
  searchQuery: string;
  tagCategory: TagCategory;
  selectedSubTags: string[];
}

export interface UrlFiltersActions {
  updateURL: (updates: Record<string, string | number | null>) => void;
  handleBlogTypeChange: (newType: BlogType) => void;
  handleBlogChange: (newBlog: string) => void;
  handlePageChange: (page: number) => void;
  handleViewModeChange: (mode: ViewMode) => void;
  handleSearchChange: (query: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  handleTagCategoryChange: (category: TagCategory) => void;
  handleSubTagChange: (subTags: string[]) => void;
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
  const searchQuery = searchParams.get("q") || "";
  const tagCategory =
    (searchParams.get("tag") as TagCategory) || ("all" as TagCategory);
  const subtagsParam = searchParams.get("subtags");
  const selectedSubTags = useMemo(
    () =>
      subtagsParam
        ? subtagsParam.split(",").filter((tag) => tag.trim() !== "")
        : [],
    [subtagsParam]
  );

  // URL 업데이트 함수
  const updateURL = useCallback(
    (updates: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (
          value === null ||
          value === "" ||
          (key === "type" && value === "company") ||
          (key === "blog" && value === "all") ||
          (key === "page" && value === 1) ||
          (key === "sort" && value === "published_at") ||
          (key === "view" && value === "gallery") ||
          (key === "q" && value === "") ||
          (key === "tag" && value === "all") ||
          (key === "subtags" && value === "")
        ) {
          params.delete(key);
        } else {
          params.set(key, value.toString());
        }
      });

      const newURL = params.toString() ? `?${params.toString()}` : "/";
      router.replace(newURL, { scroll: false });
    },
    [router, searchParams]
  );

  // 블로그 타입 변경 핸들러
  const handleBlogTypeChange = useCallback(
    (newType: BlogType) => {
      updateURL({
        type: newType,
        blog: "all",
        page: 1,
        view: viewMode,
        q: searchQuery,
        tag: "all",
        subtags: "",
      });
    },
    [updateURL, viewMode, searchQuery]
  );

  // 블로그 선택 변경 핸들러
  const handleBlogChange = useCallback(
    (newBlog: string) => {
      updateURL({ blog: newBlog, page: 1, view: viewMode, q: searchQuery });
    },
    [updateURL, viewMode, searchQuery]
  );

  // 페이지 변경 핸들러
  const handlePageChange = useCallback(
    (page: number) => {
      updateURL({ page });
    },
    [updateURL]
  );

  // 뷰 모드 변경 핸들러
  const handleViewModeChange = useCallback(
    (mode: ViewMode) => {
      updateURL({ view: mode, q: searchQuery });
    },
    [updateURL, searchQuery]
  );

  // 검색 변경 핸들러
  const handleSearchChange = useCallback(
    (query: string) => {
      updateURL({ q: query, page: 1 });
    },
    [updateURL]
  );

  const handleTagCategoryChange = useCallback(
    (category: TagCategory) => {
      updateURL({ tag: category, page: 1, subtags: "" });
    },
    [updateURL]
  );

  const handleSubTagChange = useCallback(
    (subTags: string[]) => {
      updateURL({
        subtags: subTags.length > 0 ? subTags.join(",") : "",
        page: 1,
      });
    },
    [updateURL]
  );

  // 필터 초기화
  const clearFilters = useCallback(() => {
    updateURL({
      type: "company",
      blog: "all",
      page: 1,
      q: "",
      tag: "all",
      subtags: "",
    });
  }, [updateURL]);

  // 활성 필터 확인
  const hasActiveFilters =
    blogType !== "company" ||
    selectedBlog !== "all" ||
    searchQuery !== "" ||
    tagCategory !== "all" ||
    selectedSubTags.length > 0;

  return {
    // 상태
    blogType,
    selectedBlog,
    currentPage,
    sortBy,
    viewMode,
    searchQuery,
    tagCategory,
    selectedSubTags,
    // 액션
    updateURL,
    handleBlogTypeChange,
    handleBlogChange,
    handlePageChange,
    handleViewModeChange,
    handleSearchChange,
    clearFilters,
    hasActiveFilters,
    handleTagCategoryChange,
    handleSubTagChange,
  };
}
