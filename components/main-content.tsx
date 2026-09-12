import type { ReactNode } from "react";
import { AlertCircle, RotateCcw, Search } from "lucide-react";
import { BlogCard } from "@/components/blog-card";
import { BlogListItem } from "@/components/blog-list-item";
import { InfiniteScrollTrigger } from "@/components/infinite-scroll-trigger";
import { ViewToggle } from "@/components/view-toggle";
import { SearchBar } from "@/components/search-bar";
import { BlogTypeToggle } from "@/components/blog-type-toggle";
import { BlogSelector } from "@/components/blog-selector";
import { Button } from "@/components/ui/button";
import { TagFilterBar } from "@/components/tag-filter-bar";
import { TAG_FILTER_OPTIONS } from "@/lib/tag-filters";
import type { Blog } from "@/lib/supabase";
import type { UrlFilters, UrlFiltersActions } from "@/hooks/use-url-filters";
import type { InfiniteBlogDataState } from "@/hooks/use-infinite-blog-data";

interface MainContentProps {
  data: InfiniteBlogDataState;
  filters: UrlFilters & UrlFiltersActions;
  popularContent: ReactNode;
  isWeeklyExpanded: boolean;
  onWeeklyToggle: () => void;
  onLoginClick: () => void;
}

export function MainContent({
  data,
  filters,
  popularContent,
  isWeeklyExpanded,
  onWeeklyToggle,
  onLoginClick,
}: MainContentProps) {
  const {
    blogs,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    error,
    loadMoreError,
    loadMore,
    retry,
  } = data;
  const {
    blogType,
    selectedBlog,
    viewMode,
    searchQuery,
    tagCategory,
    selectedSubTags,
  } = filters;
  const gridClassName = `grid grid-cols-1 md:grid-cols-2 ${isWeeklyExpanded ? "xl:grid-cols-2" : "xl:grid-cols-3"} gap-5`;
  const categoryLabel = TAG_FILTER_OPTIONS.find(
    (option) => option.id === tagCategory,
  )?.label;
  const handleTagClick = (tag: string): void => {
    filters.handleTagClick(tag);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const renderBlog = (blog: Blog): ReactNode =>
    viewMode === "gallery" ? (
      <BlogCard
        key={blog.id}
        blog={blog}
        onLoginClick={onLoginClick}
        selectedSubTags={selectedSubTags}
        onTagClick={handleTagClick}
      />
    ) : (
      <BlogListItem key={blog.id} blog={blog} onLoginClick={onLoginClick} />
    );

  return (
    <main id="main-content" className="min-w-0 flex-1">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          오늘 읽을 기술 이야기
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          기업과 개발자의 새로운 글을 한곳에서 만나보세요.
        </p>
      </div>
      <section
        aria-label="글 검색과 필터"
        className="mb-5 space-y-3 rounded-xl border border-border bg-card p-4"
      >
        <SearchBar
          value={searchQuery}
          onChange={filters.handleSearchChange}
          placeholder="제목이나 작성자로 검색"
        />
        <div className="flex flex-wrap items-center gap-3">
          <BlogTypeToggle
            blogType={blogType}
            onBlogTypeChange={filters.handleBlogTypeChange}
          />
          <div className="min-w-0 flex-1 sm:flex-none">
            <BlogSelector
              selectedBlog={selectedBlog}
              onBlogChange={filters.handleBlogChange}
              blogType={blogType}
            />
          </div>
        </div>
        <div className="pt-1">
          <TagFilterBar
            value={tagCategory}
            selectedSubTags={selectedSubTags}
            onChange={filters.handleTagCategoryChange}
            onSubTagChange={filters.handleSubTagChange}
          />
        </div>
        {filters.hasActiveFilters && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
            <p className="min-w-0 break-words text-xs leading-relaxed text-muted-foreground">
              현재 조건:{" "}
              {[
                blogType === "company" ? "기업" : "개인",
                selectedBlog !== "all" ? selectedBlog : null,
                tagCategory !== "all" ? categoryLabel : null,
                ...selectedSubTags,
                searchQuery ? `“${searchQuery}”` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={filters.clearFilters}
              className="shrink-0 text-muted-foreground"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              전체 초기화
            </Button>
          </div>
        )}
      </section>
      {popularContent}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground" role="status">
          {loading ? (
            "글을 불러오는 중"
          ) : error ? (
            "목록을 불러오지 못했습니다"
          ) : (
            <>
              총{" "}
              <span className="font-semibold text-foreground">
                {totalCount.toLocaleString()}
              </span>
              개의 글
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          {!isWeeklyExpanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onWeeklyToggle}
              className="hidden xl:inline-flex"
            >
              인기글 보기
            </Button>
          )}
          <ViewToggle
            viewMode={viewMode}
            onViewModeChange={filters.handleViewModeChange}
          />
        </div>
      </div>
      {loading ? (
        <div
          aria-label="글 로딩 중"
          aria-busy="true"
          className={viewMode === "gallery" ? gridClassName : "space-y-3"}
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse overflow-hidden rounded-xl border border-border bg-card"
            >
              {viewMode === "gallery" && (
                <div className="aspect-[2/1] bg-muted" />
              )}
              <div className="space-y-3 p-5">
                <div className="h-5 w-4/5 rounded bg-muted" />
                <div className="h-4 w-1/3 rounded bg-muted" />
                <div className="h-4 rounded bg-muted" />
                <div className="h-4 w-2/3 rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div
          role="alert"
          className="rounded-xl border border-border bg-card px-5 py-12 text-center"
        >
          <AlertCircle className="mx-auto mb-4 h-8 w-8 text-muted-foreground" />
          <h2 className="text-lg font-semibold">글을 불러오지 못했습니다</h2>
          <p className="mb-5 mt-2 text-sm text-muted-foreground">{error}</p>
          <Button onClick={retry}>다시 시도</Button>
        </div>
      ) : blogs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-5 py-12 text-center">
          <Search className="mx-auto mb-4 h-8 w-8 text-muted-foreground" />
          <h2 className="text-lg font-semibold">
            {filters.hasActiveFilters
              ? "조건에 맞는 글이 없습니다"
              : "아직 등록된 글이 없습니다"}
          </h2>
          <p className="mb-5 mt-2 text-sm text-muted-foreground">
            {filters.hasActiveFilters
              ? "검색어를 바꾸거나 필터를 초기화해보세요."
              : "새로운 기술 이야기가 올라오면 이곳에서 볼 수 있어요."}
          </p>
          {filters.hasActiveFilters && (
            <Button variant="outline" onClick={filters.clearFilters}>
              필터 초기화
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className={viewMode === "gallery" ? gridClassName : "space-y-3"}>
            {blogs.map(renderBlog)}
          </div>
          {loadMoreError ? (
            <div role="alert" className="py-8 text-center">
              <p className="mb-3 text-sm text-muted-foreground">
                {loadMoreError}
              </p>
              <Button variant="outline" onClick={loadMore}>
                다시 불러오기
              </Button>
            </div>
          ) : (
            <InfiniteScrollTrigger
              onLoadMore={loadMore}
              hasMore={hasMore}
              loading={loadingMore}
            />
          )}
          {!hasMore && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              모든 글을 확인했어요.
            </p>
          )}
        </>
      )}
    </main>
  );
}
