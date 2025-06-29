import { BlogCard } from "@/components/blog-card";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import type { Blog } from "@/lib/supabase";

const ITEMS_PER_PAGE = 12;

interface MainContentProps {
  blogs: Blog[];
  loading: boolean;
  totalPages: number;
  totalCount: number;
  currentPage: number;
  hasActiveFilters: boolean;
  onPageChange: (page: number) => void;
  onClearFilters: () => void;
}

export function MainContent({
  blogs,
  loading,
  totalPages,
  totalCount,
  currentPage,
  hasActiveFilters,
  onPageChange,
  onClearFilters,
}: MainContentProps) {
  return (
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
              onClick={onClearFilters}
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
                onPageChange={onPageChange}
              />
            </div>
          )}
        </>
      )}
    </main>
  );
}
