"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { MainContent } from "@/components/main-content";
import { WeeklyPopular } from "@/components/weekly-popular";
import { Footer } from "@/components/footer";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { useInfiniteBlogData } from "@/hooks/use-infinite-blog-data";
import { Blog, fetchWeeklyPopularBlogs } from "@/lib/supabase";
import { openAuthModal } from "@/components/auth/open-auth-modal";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

export default function HomePage() {
  const [popularBlogs, setPopularBlogs] = useState<Blog[]>([]);
  const [isWeeklyExpanded, setIsWeeklyExpanded] = useState(true);
  const router = useRouter();
  const scrollToTop = useScrollToTop();

  // URL 필터 상태 관리
  const {
    blogType,
    selectedBlog,
    sortBy,
    viewMode,
    searchQuery,
    tagCategory,
    selectedSubTags,
    handleBlogTypeChange,
    handleBlogChange,
    handlePageChange,
    handleViewModeChange,
    handleSearchChange,
    handleTagCategoryChange,
    handleSubTagChange,
  } = useUrlFilters();

  // 블로그 데이터 관리 (무한 스크롤)
  const { blogs, loading, loadingMore, hasMore, totalCount, loadMore } =
    useInfiniteBlogData({
      blogType,
      selectedBlog,
      sortBy,
      searchQuery,
      tagCategory,
      selectedSubTags,
    });

  // 주간 인기글 로드
  useEffect(() => {
    const loadPopularBlogs = async () => {
      try {
        const blogs = await fetchWeeklyPopularBlogs(10);
        setPopularBlogs(blogs);
      } catch (error) {
        console.error("주간 인기글 로드 실패:", error);
      }
    };

    loadPopularBlogs();
  }, []);

  // 로고 클릭 시 초기화
  const handleLogoClick = useCallback(() => {
    router.push("/");
  }, [router]);

  // 블로그 타입 변경 (다른 타입으로 변경될 때만 스크롤)
  const handleBlogTypeChangeWithScroll = useCallback(
    (type: typeof blogType) => {
      const shouldScroll = type !== blogType;
      handleBlogTypeChange(type);
      if (shouldScroll) {
        scrollToTop();
      }
    },
    [blogType, handleBlogTypeChange, scrollToTop]
  );

  // 블로그 필터 변경 (다른 블로그로 변경될 때만 스크롤)
  const handleBlogChangeWithScroll = useCallback(
    (blog: string) => {
      const shouldScroll = blog !== selectedBlog;
      handleBlogChange(blog);
      if (shouldScroll) {
        scrollToTop();
      }
    },
    [selectedBlog, handleBlogChange, scrollToTop]
  );

  const handleTagCategoryChangeWithScroll = useCallback(
    (category: typeof tagCategory) => {
      const shouldScroll = category !== tagCategory;
      handleTagCategoryChange(category);
      if (shouldScroll) {
        scrollToTop();
      }
    },
    [tagCategory, handleTagCategoryChange, scrollToTop]
  );

  const handleLoginClick = useCallback(() => {
    openAuthModal();
  }, []);

  const handleWeeklyToggle = useCallback(() => {
    setIsWeeklyExpanded((prev) => !prev);
  }, []);

  const handleWeeklyCollapse = useCallback(() => {
    setIsWeeklyExpanded(false);
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        blogType={blogType}
        selectedBlog={selectedBlog}
        onBlogTypeChange={handleBlogTypeChangeWithScroll}
        onBlogChange={handleBlogChangeWithScroll}
        onLogoClick={handleLogoClick}
        onLoginClick={handleLoginClick}
      />

      <div className="container mx-auto px-4 flex gap-8 pt-24">
        <MainContent
          blogs={blogs}
          loading={loading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          totalCount={totalCount}
          viewMode={viewMode}
          searchQuery={searchQuery}
          tagCategory={tagCategory}
          selectedSubTags={selectedSubTags}
          onLoadMore={loadMore}
          onViewModeChange={handleViewModeChange}
          onSearchChange={handleSearchChange}
          onTagCategoryChange={handleTagCategoryChangeWithScroll}
          onSubTagChange={handleSubTagChange}
          isWeeklyExpanded={isWeeklyExpanded}
          onWeeklyToggle={handleWeeklyToggle}
          onLoginClick={handleLoginClick}
        />
        {isWeeklyExpanded ? (
          <>
            <div className="hidden xl:block relative border-l border-slate-200 dark:border-slate-700">
              <Button
                variant="outline"
                size="icon"
                onClick={handleWeeklyCollapse}
                className="absolute top-20 -left-4 h-8 w-8 rounded-full bg-background hover:bg-muted"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <WeeklyPopular blogs={popularBlogs} />
          </>
        ) : null}
      </div>

      {/* 모든 데이터를 로드했을 때만 푸터 표시 */}
      {!hasMore && !loading && blogs.length > 0 && <Footer />}
    </div>
  );
}
