"use client";

import { useRouter } from "next/navigation";
import { Header } from "@/components/header";
import { MainContent } from "@/components/main-content";
import { Footer } from "@/components/footer";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { useBlogData } from "@/hooks/use-blog-data";

export default function HomePage() {
  const router = useRouter();
  const scrollToTop = useScrollToTop();

  // URL 필터 상태 관리
  const {
    blogType,
    selectedBlog,
    currentPage,
    sortBy,
    handleBlogTypeChange,
    handleBlogChange,
    handlePageChange,
    clearFilters,
    hasActiveFilters,
  } = useUrlFilters();

  // 블로그 데이터 관리
  const { blogs, loading, totalPages, totalCount } = useBlogData({
    blogType,
    selectedBlog,
    currentPage,
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
    <div className="min-h-screen bg-background">
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
        totalPages={totalPages}
        totalCount={totalCount}
        currentPage={currentPage}
        hasActiveFilters={hasActiveFilters}
        onPageChange={handlePageChangeWithScroll}
        onClearFilters={handleClearFilters}
      />
      <Footer />
    </div>
  );
}
