"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { MainContent } from "@/components/main-content";
import { WeeklyPopular } from "@/components/weekly-popular";
import { Footer } from "@/components/footer";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { useInfiniteBlogData } from "@/hooks/use-infinite-blog-data";
import { Blog, fetchWeeklyPopularBlogs } from "@/lib/supabase";
import { AuthModal } from "@/components/auth/auth-modal";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

export default function HomePage() {
  const [popularBlogs, setPopularBlogs] = useState<Blog[]>([]);
  const [isWeeklyExpanded, setIsWeeklyExpanded] = useState(true);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const router = useRouter();
  const scrollToTop = useScrollToTop();

  // URL 필터 상태 관리
  const {
    blogType,
    selectedBlog,
    currentPage,
    sortBy,
    viewMode,
    searchQuery,
    handleBlogTypeChange,
    handleBlogChange,
    handlePageChange,
    handleViewModeChange,
    handleSearchChange,
    clearFilters,
    hasActiveFilters,
  } = useUrlFilters();

  // 블로그 데이터 관리 (무한 스크롤)
  const { blogs, loading, loadingMore, hasMore, totalCount, loadMore } =
    useInfiniteBlogData({
      blogType,
      selectedBlog,
      sortBy,
      searchQuery,
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
  const handleLogoClick = () => {
    router.push("/");
  };

  // 블로그 타입 변경 (다른 타입으로 변경될 때만 스크롤)
  const handleBlogTypeChangeWithScroll = (type: typeof blogType) => {
    const shouldScroll = type !== blogType;  // 타입이 변경되는 경우에만 스크롤
    handleBlogTypeChange(type);
    if (shouldScroll) {
      scrollToTop();
    }
  };

  // 필터 초기화 (스크롤 추가)
  const handleClearFilters = () => {
    clearFilters();
    scrollToTop();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        blogType={blogType}
        selectedBlog={selectedBlog}
        hasActiveFilters={hasActiveFilters}
        onBlogTypeChange={handleBlogTypeChangeWithScroll}
        onBlogChange={handleBlogChange}
        onClearFilters={handleClearFilters}
        onLogoClick={handleLogoClick}
        onLoginClick={() => setAuthModalOpen(true)}
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
          hasActiveFilters={hasActiveFilters}
          onLoadMore={loadMore}
          onViewModeChange={handleViewModeChange}
          onSearchChange={handleSearchChange}
          onClearFilters={handleClearFilters}
          isWeeklyExpanded={isWeeklyExpanded}
          onWeeklyToggle={() => setIsWeeklyExpanded(!isWeeklyExpanded)}
          onLoginClick={() => setAuthModalOpen(true)}
        />
        {isWeeklyExpanded ? (
          <>
            <div className="hidden xl:block relative border-l border-slate-200 dark:border-slate-700">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setIsWeeklyExpanded(false)}
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

      {/* 인증 모달 */}
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </div>
  );
}
