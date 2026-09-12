import { BlogCard } from "@/components/blog-card";
import { BlogListItem } from "@/components/blog-list-item";
import { InfiniteScrollTrigger } from "@/components/infinite-scroll-trigger";
import { ViewToggle } from "@/components/view-toggle";
import { Button } from "@/components/ui/button";
import { TagFilterBar } from "@/components/tag-filter-bar";
import {
  type TagCategory,
} from "@/lib/tag-filters";
import type { Blog } from "@/lib/supabase";
import { ChevronLeft } from "lucide-react";
import { useCallback } from "react";

interface MainContentProps {
  blogs: Blog[];
  loading: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;
  totalCount: number;
  viewMode: "gallery" | "list";
  searchQuery: string;
  tagCategory: TagCategory;
  selectedSubTags: string[];
  isWeeklyExpanded: boolean;
  onLoadMore?: () => void;
  error?: string | null;
  loadMoreError?: string | null;
  onRetry?: () => void;
  onTagClick: (tag: string) => void;
  onViewModeChange: (mode: "gallery" | "list") => void;
  onSearchChange: (query: string) => void;
  onTagCategoryChange: (category: TagCategory) => void;
  onSubTagChange: (subTags: string[]) => void;
  onWeeklyToggle: () => void;
  onLoginClick: () => void;
}

export function MainContent({
  blogs,
  loading,
  loadingMore,
  hasMore,
  totalCount,
  viewMode,
  searchQuery,
  tagCategory,
  selectedSubTags,
  isWeeklyExpanded,
  onLoadMore,
  error,
  loadMoreError,
  onRetry,
  onTagClick,
  onViewModeChange,
  onSearchChange,
  onTagCategoryChange,
  onSubTagChange,
  onWeeklyToggle,
  onLoginClick,
}: MainContentProps) {
  // 태그 클릭 시 필터에 추가
  const handleTagClick = useCallback(
    (tag: string) => {
      onTagClick(tag);

      // 상단으로 스크롤
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [onTagClick]
  );

  return (
    <main className="flex-1 pt-4">
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

      <div className="mb-6 w-full overflow-hidden">
        <TagFilterBar
          value={tagCategory}
          selectedSubTags={selectedSubTags}
          onChange={onTagCategoryChange}
          onSubTagChange={onSubTagChange}
        />
      </div>

      {loading ? (
        <>
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
      ) : error ? (
        <div role="alert" className="text-center py-16">
          <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-slate-100">
            글을 불러오지 못했습니다
          </h3>
          <p className="mb-4 text-slate-600 dark:text-slate-400">{error}</p>
          <Button variant="outline" onClick={onRetry}>다시 시도</Button>
        </div>
      ) : blogs.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-8xl mb-6">🔍</div>
          <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-slate-100">
            검색 결과가 없습니다
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            다른 키워드로 검색해보세요.
          </p>
        </div>
      ) : (
        <>
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
                <BlogCard
                  key={blog.id}
                  blog={blog}
                  onLoginClick={onLoginClick}
                  selectedSubTags={selectedSubTags}
                  onTagClick={handleTagClick}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {blogs.map((blog) => (
                <BlogListItem
                  key={blog.id}
                  blog={blog}
                  onLoginClick={onLoginClick}
                />
              ))}
            </div>
          )}

          {/* 무한 스크롤 트리거 */}
          {loadMoreError && (
            <div role="alert" className="py-8 text-center">
              <p className="mb-3 text-sm text-muted-foreground">{loadMoreError}</p>
              <Button variant="outline" onClick={onLoadMore}>다시 불러오기</Button>
            </div>
          )}
          {onLoadMore && hasMore !== undefined && !loadMoreError && (
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
