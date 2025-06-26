"use client";

import { useState, useEffect } from "react";
import { SearchBar } from "@/components/search-bar";
import { SortToggle } from "@/components/sort-toggle";
import { BlogCard } from "@/components/blog-card";
import { NavigationBar } from "@/components/navigation-bar";
import { BlogFormModal } from "@/components/blog-form-modal";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, X } from "lucide-react";
import { fetchBlogs, type Blog } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function HomePage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<
    "published_at" | "title" | "created_at" | "views"
  >("published_at");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingBlog, setEditingBlog] = useState<Blog | null>(null);

  const { toast } = useToast();
  const ITEMS_PER_PAGE = 12;

  // 데이터 로드
  const loadBlogs = async (resetPage = false) => {
    try {
      setLoading(true);
      const page = resetPage ? 1 : currentPage;

      const result = await fetchBlogs({
        page,
        limit: ITEMS_PER_PAGE,
        search: searchQuery,
        sortBy,
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
  }, [searchQuery, sortBy]);

  // 페이지 변경 시 데이터 로드
  useEffect(() => {
    if (currentPage > 1) {
      loadBlogs();
    }
  }, [currentPage]);

  // 필터 초기화
  const clearFilters = () => {
    setSearchQuery("");
    setCurrentPage(1);
  };

  // 활성 필터 확인
  const hasActiveFilters = searchQuery.trim() !== "";

  // 블로그 추가/수정 완료 핸들러
  const handleBlogSaved = () => {
    setIsFormModalOpen(false);
    setEditingBlog(null);
    loadBlogs(true);
    toast({
      title: "성공",
      description: editingBlog
        ? "블로그가 수정되었습니다."
        : "새 블로그가 추가되었습니다.",
    });
  };

  // 블로그 삭제 완료 핸들러
  const handleBlogDeleted = () => {
    loadBlogs(true);
    toast({
      title: "성공",
      description: "블로그가 삭제되었습니다.",
    });
  };

  // 블로그 수정 핸들러
  const handleEditBlog = (blog: Blog) => {
    setEditingBlog(blog);
    setIsFormModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 상단 고정 헤더 */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Techgom</h1>
              <div className="flex items-center gap-2">
                <div className="text-sm text-muted-foreground">
                  {loading ? "로딩 중..." : `${totalCount}개의 글`}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadBlogs(true)}
                  disabled={loading}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                </Button>
                <Button size="sm" onClick={() => setIsFormModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />글 추가
                </Button>
              </div>
            </div>

            {/* 검색창 */}
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="제목, 작성자, 태그로 검색..."
            />

            {/* 필터 및 정렬 */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {/* 필터 초기화 버튼 */}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4 mr-1" />
                    검색 초기화
                  </Button>
                )}
              </div>

              <SortToggle sortBy={sortBy} onSortChange={setSortBy} />
            </div>

            {/* 활성 필터 표시 */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 text-sm">
                {searchQuery.trim() && (
                  <div className="bg-primary/10 text-primary px-2 py-1 rounded-md">
                    검색: "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted rounded-lg h-64"></div>
              </div>
            ))}
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">검색 결과가 없습니다</h3>
            <p className="text-muted-foreground mb-4">
              {hasActiveFilters
                ? "다른 키워드로 검색해보세요."
                : "블로그 글이 없습니다."}
            </p>
            {hasActiveFilters ? (
              <Button onClick={clearFilters} variant="outline">
                검색 초기화
              </Button>
            ) : (
              <Button onClick={() => setIsFormModalOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />첫 번째 글 추가하기
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogs.map((blog) => (
                <BlogCard
                  key={blog.id}
                  blog={blog}
                  searchQuery={searchQuery}
                  onEdit={handleEditBlog}
                  onDeleted={handleBlogDeleted}
                />
              ))}
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalCount={totalCount}
                  itemsPerPage={ITEMS_PER_PAGE}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* 블로그 추가/수정 모달 */}
      <BlogFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingBlog(null);
        }}
        onSaved={handleBlogSaved}
        editingBlog={editingBlog}
      />

      {/* 하단 네비게이션 (모바일) */}
      <NavigationBar />
    </div>
  );
}
