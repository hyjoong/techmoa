"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { type Blog, fetchBlogs } from "@/lib/supabase";
import type { BlogType, SortBy } from "./use-url-filters";
import { getTagsForCategory, type TagCategory } from "@/lib/tag-filters";

const ITEMS_PER_PAGE = 12;

export interface InfiniteBlogDataState {
  blogs: Blog[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  totalCount: number;
  error: string | null;
  loadMoreError: string | null;
  loadMore: () => void;
  retry: () => void;
}

export interface InfiniteBlogDataFilters {
  blogType: BlogType;
  selectedBlog: string;
  sortBy: SortBy;
  searchQuery: string;
  tagCategory: TagCategory;
  selectedSubTags: string[];
}

export function useInfiniteBlogData(
  filters: InfiniteBlogDataFilters,
): InfiniteBlogDataState {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const pageRef = useRef(1);
  const requestRef = useRef<AbortController | null>(null);
  const generationRef = useRef(0);
  const loadingMoreRef = useRef(false);
  // 값이 같은 필터로 불필요하게 다시 조회하지 않도록 비교한다.
  const filterKey = JSON.stringify(filters);
  const activeKeyRef = useRef("");

  useEffect(() => {
    const currentFilters: InfiniteBlogDataFilters = JSON.parse(filterKey);
    const controller = new AbortController();
    requestRef.current = controller;
    const generation = ++generationRef.current;
    activeKeyRef.current = filterKey;
    pageRef.current = 1;
    loadingMoreRef.current = false;
    setBlogs([]);
    setTotalCount(0);
    setHasMore(false);
    setLoading(true);
    setLoadingMore(false);
    setError(null);
    setLoadMoreError(null);

    const load = async (): Promise<void> => {
      try {
        const result = await fetchBlogs({
          page: 1,
          limit: ITEMS_PER_PAGE,
          sortBy: currentFilters.sortBy,
          blogType: currentFilters.blogType,
          author:
            currentFilters.selectedBlog === "all"
              ? undefined
              : currentFilters.selectedBlog,
          search: currentFilters.searchQuery || undefined,
          tags: getTagsForCategory(
            currentFilters.tagCategory,
            currentFilters.selectedSubTags,
          ),
          signal: controller.signal,
        });
        if (controller.signal.aborted || generation !== generationRef.current)
          return;
        setBlogs(result.blogs);
        setTotalCount(result.totalCount);
        setHasMore(result.totalPages > 1);
      } catch {
        if (controller.signal.aborted || generation !== generationRef.current)
          return;
        setError("글을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      } finally {
        if (!controller.signal.aborted && generation === generationRef.current)
          setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [filterKey, retryCount]);

  const loadMore = useCallback(async (): Promise<void> => {
    const controller = requestRef.current;
    if (
      loading ||
      loadingMoreRef.current ||
      !hasMore ||
      !controller ||
      controller.signal.aborted ||
      activeKeyRef.current !== filterKey
    )
      return;
    const generation = generationRef.current;
    const currentFilters: InfiniteBlogDataFilters = JSON.parse(filterKey);
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const nextPage = pageRef.current + 1;
      const result = await fetchBlogs({
        page: nextPage,
        limit: ITEMS_PER_PAGE,
        sortBy: currentFilters.sortBy,
        blogType: currentFilters.blogType,
        author:
          currentFilters.selectedBlog === "all"
            ? undefined
            : currentFilters.selectedBlog,
        search: currentFilters.searchQuery || undefined,
        tags: getTagsForCategory(
          currentFilters.tagCategory,
          currentFilters.selectedSubTags,
        ),
        signal: controller.signal,
      });
      if (controller.signal.aborted || generation !== generationRef.current)
        return;
      setBlogs((previous) => {
        const ids = new Set(previous.map((blog) => blog.id));
        return [
          ...previous,
          ...result.blogs.filter((blog) => !ids.has(blog.id)),
        ];
      });
      pageRef.current = nextPage;
      setHasMore(nextPage < result.totalPages);
    } catch {
      if (controller.signal.aborted || generation !== generationRef.current)
        return;
      setLoadMoreError("다음 글을 불러오지 못했습니다.");
    } finally {
      if (!controller.signal.aborted && generation === generationRef.current) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [filterKey, hasMore, loading]);

  return {
    blogs,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    error,
    loadMoreError,
    loadMore,
    retry: () => setRetryCount((value) => value + 1),
  };
}
