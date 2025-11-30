"use client";

import { useState, useEffect } from "react";
import { Blog, fetchBlogs } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import type { BlogType, SortBy } from "./use-url-filters";
import { getTagsForCategory, type TagCategory } from "@/lib/tag-filters";

const ITEMS_PER_PAGE = 12;

export interface BlogDataState {
  blogs: Blog[];
  loading: boolean;
  totalPages: number;
  totalCount: number;
}

export interface BlogDataFilters {
  blogType: BlogType;
  selectedBlog: string;
  currentPage: number;
  sortBy: SortBy;
  tagCategory: TagCategory;
}

export function useBlogData(filters: BlogDataFilters): BlogDataState {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const { toast } = useToast();
  const scrollToTop = useScrollToTop();

  // 데이터 로드
  const loadBlogs = async () => {
    try {
      setLoading(true);

      const result = await fetchBlogs({
        page: filters.currentPage,
        limit: ITEMS_PER_PAGE,
        sortBy: filters.sortBy,
        blogType: filters.blogType,
        author:
          filters.selectedBlog === "all" ? undefined : filters.selectedBlog,
        tags: getTagsForCategory(filters.tagCategory),
      });

      setBlogs(result.blogs);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
    } catch (error) {
      console.error("블로그 로드 실패:", error);
      toast({
        title: "오류",
        description: "블로그 데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // URL 파라미터 변경 시 데이터 로드
  useEffect(() => {
    loadBlogs();
    // 필터 변경 시 상단으로 스크롤 (초기 로드 제외)
    if (
      filters.blogType !== "company" ||
      filters.selectedBlog !== "all" ||
      filters.currentPage > 1
    ) {
      scrollToTop();
    }
  }, [
    filters.sortBy,
    filters.blogType,
    filters.selectedBlog,
    filters.currentPage,
    filters.tagCategory,
    scrollToTop,
  ]);

  return {
    blogs,
    loading,
    totalPages,
    totalCount,
  };
}
