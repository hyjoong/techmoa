"use client";

import { useState, useEffect } from "react";
import { BlogCard } from "@/components/blog-card";
// import { BlogFormModal } from "@/components/blog-form-modal";
import { BlogTypeToggle } from "@/components/blog-type-toggle";
import { BlogSelector } from "@/components/blog-selector";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Blog, fetchBlogs } from "@/lib/supabase";
import { Github, RotateCcw } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useRouter } from "next/navigation";
import Link from "next/link";

const ITEMS_PER_PAGE = 12;

export default function HomePage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [blogType, setBlogType] = useState<"company" | "personal">("company");
  const [selectedBlog, setSelectedBlog] = useState("all");
  const [sortBy, setSortBy] = useState<"published_at" | "title" | "views">(
    "published_at"
  );
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  // const [editingBlog, setEditingBlog] = useState<Blog | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  // 데이터 로드
  const loadBlogs = async (resetPage = false) => {
    try {
      setLoading(true);
      const page = resetPage ? 1 : currentPage;

      const result = await fetchBlogs({
        page,
        limit: ITEMS_PER_PAGE,
        sortBy,
        blogType,
        author: selectedBlog === "all" ? undefined : selectedBlog,
      });

      setBlogs(result.blogs);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
      if (resetPage) setCurrentPage(1);
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

  // 초기 로드 및 필터 변경 시 데이터 재로드
  useEffect(() => {
    loadBlogs(true);
  }, [sortBy, blogType, selectedBlog]);

  // 페이지 변경 시 데이터 로드
  useEffect(() => {
    if (currentPage > 1) {
      loadBlogs();
    }
  }, [currentPage]);

  // 블로그 타입 변경 시 선택된 블로그 초기화
  useEffect(() => {
    setSelectedBlog("all");
  }, [blogType]);

  // 필터 초기화
  const clearFilters = () => {
    setBlogType("company");
    setSelectedBlog("all");
    setCurrentPage(1);
  };

  // 로고 클릭 시 초기화
  const handleLogoClick = () => {
    router.push("/");
  };

  // 활성 필터 확인
  const hasActiveFilters = blogType !== "company" || selectedBlog !== "all";

  // // 블로그 추가/수정 완료 핸들러
  // const handleBlogSaved = () => {
  //   setIsFormModalOpen(false);
  //   setEditingBlog(null);
  //   loadBlogs(true);
  //   toast({
  //     title: "성공",
  //     description: editingBlog
  //       ? "블로그가 수정되었습니다."
  //       : "새 블로그가 추가되었습니다.",
  //   });
  // };

  // // 블로그 삭제 완료 핸들러
  // const handleBlogDeleted = () => {
  //   loadBlogs(true);
  //   toast({
  //     title: "성공",
  //     description: "블로그가 삭제되었습니다.",
  //   });
  // };

  // // 블로그 수정 핸들러
  // const handleEditBlog = (blog: Blog) => {
  //   setEditingBlog(blog);
  //   setIsFormModalOpen(true);
  // };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
                onBlogTypeChange={setBlogType}
              />
              <BlogSelector
                selectedBlog={selectedBlog}
                onBlogChange={setSelectedBlog}
                blogType={blogType}
              />

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
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
                onBlogTypeChange={setBlogType}
              />
              <BlogSelector
                selectedBlog={selectedBlog}
                onBlogChange={setSelectedBlog}
                blogType={blogType}
              />

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
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
            {hasActiveFilters ? (
              <Button
                onClick={clearFilters}
                variant="outline"
                className="rounded-full px-8 py-3 text-lg"
              >
                검색 초기화
              </Button>
            ) : (
              <Button
                onClick={() => setIsFormModalOpen(true)}
                className="rounded-full px-8 py-3 text-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                첫 번째 블로그 추가하기
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
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* 블로그 추가/수정 모달 */}
      {/* <BlogFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingBlog(null);
        }}
        blog={editingBlog}
        onSaved={handleBlogSaved}
      /> */}

      {/* 푸터 */}
      <footer className="mt-16 border-t border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">
                Techmoa
              </h3>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 text-sm">
              <Link
                href="/terms"
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                서비스 이용약관
              </Link>
              <Link
                href="/privacy"
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                개인정보 처리방침
              </Link>
              <a
                href="https://github.com/hyjoong/techmoa"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                title="GitHub"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200/50 dark:border-slate-700/50 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-500">
              © 2025 Techmoa. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
