"use client";

import { BlogCard } from "@/components/blog-card";
import { BlogTypeToggle } from "@/components/blog-type-toggle";
import { BlogSelector } from "@/components/blog-selector";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/footer";
import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { useBlogData } from "@/hooks/use-blog-data";

const ITEMS_PER_PAGE = 12;

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
      {/* 상단 고정 헤더 */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="container mx-auto px-4 py-3">
          {/* 데스크톱 레이아웃 */}
          <div className="hidden sm:flex sm:items-center justify-between gap-3">
            {/* 로고 */}
            <button
              onClick={handleLogoClick}
              className="hover:opacity-80 transition-opacity"
            >
              <h1 className="text-2xl font-black text-blue-600 dark:text-blue-400">
                Techmoa
              </h1>
            </button>

            {/* 필터들 */}
            <div className="flex items-center gap-3">
              <BlogTypeToggle
                blogType={blogType}
                onBlogTypeChange={handleBlogTypeChange}
              />
              <BlogSelector
                selectedBlog={selectedBlog}
                onBlogChange={handleBlogChange}
                blogType={blogType}
              />

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}

              <ThemeToggle />
            </div>
          </div>

          {/* 모바일 레이아웃 */}
          <div className="sm:hidden">
            {/* 첫 번째 줄: 로고와 테마 */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={handleLogoClick}
                className="hover:opacity-80 transition-opacity"
              >
                <h1 className="text-xl font-black text-blue-600 dark:text-blue-400">
                  Techmoa
                </h1>
              </button>
              <ThemeToggle />
            </div>

            {/* 두 번째 줄: 필터들 */}
            <div className="flex items-center justify-between gap-2">
              <BlogTypeToggle
                blogType={blogType}
                onBlogTypeChange={handleBlogTypeChange}
              />
              <BlogSelector
                selectedBlog={selectedBlog}
                onBlogChange={handleBlogChange}
                blogType={blogType}
              />

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-2xl h-80"></div>
              </div>
            ))}
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-8xl mb-6">🔍</div>
            <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-slate-100">
              검색 결과가 없습니다
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 text-lg">
              {hasActiveFilters
                ? "다른 키워드로 검색해보세요."
                : "블로그 글이 없습니다."}
            </p>
            {hasActiveFilters && (
              <Button
                onClick={handleClearFilters}
                variant="outline"
                className="rounded-full px-8 py-3 text-lg"
              >
                검색 초기화
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogs.map((blog) => (
                <BlogCard key={blog.id} blog={blog} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-12">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalCount={totalCount}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={handlePageChangeWithScroll}
                />
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
