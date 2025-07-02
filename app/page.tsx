"use client";

import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { MainContent } from "@/components/main-content";
import { Footer } from "@/components/footer";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { useInfiniteBlogData } from "@/hooks/use-infinite-blog-data";

export default function HomePage() {
  const router = useRouter();
  const scrollToTop = useScrollToTop();

  // URL 필터 상태 관리
  const {
    blogType,
    selectedBlog,
    currentPage,
    sortBy,
    viewMode,
    handleBlogTypeChange,
    handleBlogChange,
    handlePageChange,
    handleViewModeChange,
    clearFilters,
    hasActiveFilters,
  } = useUrlFilters();

  // 블로그 데이터 관리 (무한 스크롤)
  const { blogs, loading, loadingMore, hasMore, totalCount, loadMore } = useInfiniteBlogData({
    blogType,
    selectedBlog,
    sortBy,
  });

  // 로고 클릭 시 초기화
  const handleLogoClick = () => {
    router.push("/");
  };

  // 페이지 변경 핸들러 (스크롤 추가)
  const handlePageChangeWithScroll = (page: number) => {
    handlePageChange(page);
    scrollToTop();
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
        onBlogTypeChange={handleBlogTypeChange}
        onBlogChange={handleBlogChange}
        onClearFilters={handleClearFilters}
        onLogoClick={handleLogoClick}
      />

      <MainContent
        blogs={blogs}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        totalCount={totalCount}
        viewMode={viewMode}
        hasActiveFilters={hasActiveFilters}
        onLoadMore={loadMore}
        onViewModeChange={handleViewModeChange}
        onClearFilters={handleClearFilters}
      />
      {/* 모든 데이터를 로드했을 때만 푸터 표시 */}
      {!hasMore && !loading && blogs.length > 0 && <Footer />}
    </div>
  );
}
