"use client";

import { useState, useEffect, useCallback } from "react";
import type { Blog } from "@/lib/db";
import { useToast } from "@/hooks/use-toast";
import type { BlogType, SortBy } from "./use-url-filters";
import { getTagsForCategory, type TagCategory } from "@/lib/tag-filters";

const ITEMS_PER_PAGE = 12;

export interface InfiniteBlogDataState {
  blogs: Blog[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  totalCount: number;
  loadMore: () => void;
}

export interface InfiniteBlogDataFilters {
  blogType: BlogType;
  selectedBlog: string;
  sortBy: SortBy;
  searchQuery: string;
  tagCategory: TagCategory;
  selectedSubTags: string[];
}

async function fetchBlogsFromAPI(params: {
  page: number;
  limit: number;
  sortBy: string;
  blogType: string;
  author?: string;
  search?: string;
  tags?: string[];
}) {
  const searchParams = new URLSearchParams({
    page: params.page.toString(),
    limit: params.limit.toString(),
    sortBy: params.sortBy,
    blogType: params.blogType,
  });

  if (params.author) searchParams.set("author", params.author);
  if (params.search) searchParams.set("search", params.search);
  if (params.tags && params.tags.length > 0) {
    searchParams.set("tags", params.tags.join(","));
  }

  const res = await fetch(`/api/blogs?${searchParams.toString()}`);
  if (!res.ok) throw new Error("블로그 조회 실패");
  return res.json();
}

export function useInfiniteBlogData(
  filters: InfiniteBlogDataFilters
): InfiniteBlogDataState {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();

  // 초기 데이터 로드
  const loadInitialBlogs = async () => {
    try {
      setLoading(true);
      setCurrentPage(1);

      const tags = getTagsForCategory(filters.tagCategory, filters.selectedSubTags);

      const result = await fetchBlogsFromAPI({
        page: 1,
        limit: ITEMS_PER_PAGE,
        sortBy: filters.sortBy,
        blogType: filters.blogType,
        author: filters.selectedBlog === "all" ? undefined : filters.selectedBlog,
        search: filters.searchQuery || undefined,
        tags,
      });

      setBlogs(result.blogs);
      setTotalCount(result.totalCount);
      setHasMore(result.totalPages > 1);
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

  // 추가 데이터 로드
  const loadMoreBlogs = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const nextPage = currentPage + 1;

      const result = await fetchBlogsFromAPI({
        page: nextPage,
        limit: ITEMS_PER_PAGE,
        sortBy: filters.sortBy,
        blogType: filters.blogType,
        author: filters.selectedBlog === "all" ? undefined : filters.selectedBlog,
        search: filters.searchQuery || undefined,
        tags: getTagsForCategory(filters.tagCategory, filters.selectedSubTags),
      });

      setBlogs((prev) => [...prev, ...result.blogs]);
      setCurrentPage(nextPage);
      setHasMore(nextPage < result.totalPages);
    } catch (error) {
      console.error("추가 블로그 로드 실패:", error);
      toast({
        title: "오류",
        description: "추가 데이터를 불러오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoadingMore(false);
    }
  }, [currentPage, hasMore, loadingMore, filters, toast]);

  // 필터 변경 시 초기화
  useEffect(() => {
    loadInitialBlogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.sortBy,
    filters.blogType,
    filters.selectedBlog,
    filters.searchQuery,
    filters.tagCategory,
    filters.selectedSubTags.join(","),
  ]);

  return {
    blogs,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    loadMore: loadMoreBlogs,
  };
}
