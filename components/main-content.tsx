import { BlogCard } from "@/components/blog-card";
import { BlogListItem } from "@/components/blog-list-item";
import { InfiniteScrollTrigger } from "@/components/infinite-scroll-trigger";
import { ViewToggle } from "@/components/view-toggle";
import { Button } from "@/components/ui/button";
import type { Blog } from "@/lib/supabase";
import { ChevronLeft } from "lucide-react";

interface MainContentProps {
  blogs: Blog[];
  loading: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  totalCount: number;
  viewMode: "gallery" | "list";
  searchQuery: string;
  hasActiveFilters: boolean;
  isWeeklyExpanded: boolean;
  onLoadMore?: () => void;
  onViewModeChange: (mode: "gallery" | "list") => void;
  onSearchChange: (query: string) => void;
  onClearFilters: () => void;
  onWeeklyToggle: () => void;
}

export function MainContent({
  blogs,
  loading,
  loadingMore,
  hasMore,
  totalCount,
  viewMode,
  searchQuery,
  hasActiveFilters,
  isWeeklyExpanded,
  onLoadMore,
  onViewModeChange,
  onSearchChange,
  onClearFilters,
  onWeeklyToggle,
}: MainContentProps) {
  return (
    <main className="flex-1 pt-4">
      {loading ? (
        <>
          {/* 뷰 토글 */}
          <div className="mb-4 flex items-center gap-4">
            <ViewToggle
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
            />
            {!isWeeklyExpanded && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onWeeklyToggle}
                className="hidden xl:flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                <ChevronLeft className="h-4 w-4" />
                주간 인기글 보기
              </Button>
            )}
          </div>
          {/* 로딩 스켈레톤 */}
          {viewMode === "gallery" ? (
            <div
              className={`grid grid-cols-1 md:grid-cols-2 ${
                isWeeklyExpanded ? "xl:grid-cols-2" : "xl:grid-cols-3"
              } gap-8`}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-2xl h-80"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-lg h-32"></div>
                </div>
              ))}
            </div>
          )}
        </>
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
          {/* 뷰 토글 */}
          <div className="mb-4 flex items-center gap-4">
            <ViewToggle
              viewMode={viewMode}
              onViewModeChange={onViewModeChange}
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
            />
            {!isWeeklyExpanded && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onWeeklyToggle}
                className="hidden xl:flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                <ChevronLeft className="h-4 w-4" />
                주간 인기글 보기
              </Button>
            )}
          </div>
          {/* 검색 결과 개수 표시 */}
          {searchQuery && (
            <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
              '
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {searchQuery}
              </span>
              ' 검색 결과{" "}
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {totalCount}개
              </span>
            </div>
          )}
          {/* 블로그 목록 */}
          {viewMode === "gallery" ? (
            <div
              className={`grid grid-cols-1 md:grid-cols-2 ${
                isWeeklyExpanded ? "xl:grid-cols-2" : "xl:grid-cols-3"
              } gap-8`}
            >
              {blogs.map((blog) => (
                <BlogCard key={blog.id} blog={blog} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {blogs.map((blog) => (
                <BlogListItem key={blog.id} blog={blog} />
              ))}
            </div>
          )}

          {/* 무한 스크롤 트리거 */}
          {onLoadMore && hasMore !== undefined && (
            <InfiniteScrollTrigger
              onLoadMore={onLoadMore}
              hasMore={hasMore}
              loading={loadingMore || false}
            />
          )}

          {/* 푸터가 표시될 때 여백 추가 */}
          {!hasMore && !loading && blogs.length > 0 && (
            <div className="pb-16"></div>
          )}
        </>
      )}
    </main>
  );
}
