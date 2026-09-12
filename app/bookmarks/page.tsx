"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getBookmarkedBlogs, type BookmarkedBlog } from "@/lib/bookmarks";
import { BlogCard } from "@/components/blog-card";
import { BlogListItem } from "@/components/blog-list-item";
import { BookmarkSkeleton } from "@/components/bookmark-skeleton";
import { SearchBar } from "@/components/search-bar";
import { ViewToggle } from "@/components/view-toggle";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { openAuthModal } from "@/components/auth/open-auth-modal";
import { Bookmark, Search, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function BookmarksPage() {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [result, setResult] = useState<{
    userId: string;
    blogs: BookmarkedBlog[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [viewMode, setViewMode] = useState<"gallery" | "list">("gallery");
  const [searchQuery, setSearchQuery] = useState("");
  const handleLoginClick = (): void => {
    openAuthModal();
  };

  useEffect(() => {
    let active = true;
    setResult(null);
    setError(null);
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void getBookmarkedBlogs()
      .then(({ blogs, error: fetchError }) => {
        if (!active) return;
        if (fetchError) throw new Error(fetchError.message);
        setResult({ userId, blogs });
      })
      .catch(() => {
        if (active) setError("북마크한 글을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, retryCount]);

  const blogs = result && result.userId === userId ? result.blogs : [];
  const filteredBlogs = blogs.filter((blog) =>
    [blog.title, blog.summary, blog.author].some((value) =>
      value?.toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  );
  const handleBookmarkRemoved = (id: number): void => {
    setResult((previous) =>
      previous
        ? {
            ...previous,
            blogs: previous.blogs.filter((blog) => blog.id !== id),
          }
        : null,
    );
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header onLoginClick={handleLoginClick} />
      <main className="container mx-auto flex-1 px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          저장한 기술 이야기
        </h1>
        <p className="mb-6 mt-2 text-sm text-muted-foreground">
          다시 읽고 싶은 글을 모아두세요. 최근 저장한 순서로 보여드려요.
        </p>
        {authLoading ? (
          <BookmarkSkeleton
            viewMode={viewMode === "gallery" ? "card" : "list"}
            count={6}
          />
        ) : !userId ? (
          <div className="mx-auto max-w-md rounded-xl border border-border bg-card px-6 py-12 text-center">
            <Bookmark className="mx-auto mb-4 h-10 w-10 text-primary" />
            <h2 className="text-xl font-semibold">
              읽고 싶은 글을 저장해보세요
            </h2>
            <p className="mb-6 mt-2 text-sm text-muted-foreground">
              로그인하면 북마크한 글을 언제든 다시 볼 수 있어요.
            </p>
            <Button onClick={handleLoginClick}>로그인하기</Button>
            <Button asChild variant="ghost" className="ml-2">
              <Link href="/">글 둘러보기</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-4 rounded-xl border border-border bg-card p-4">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="북마크한 글 검색"
              />
            </div>
            <div className="mb-5 flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground" role="status">
                총 {filteredBlogs.length}개의 글
              </p>
              <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
            </div>
            {loading ? (
              <BookmarkSkeleton
                viewMode={viewMode === "gallery" ? "card" : "list"}
                count={6}
              />
            ) : error ? (
              <div role="alert" className="py-12 text-center">
                <AlertCircle className="mx-auto mb-4 h-8 w-8 text-muted-foreground" />
                <p className="mb-4">{error}</p>
                <Button
                  variant="outline"
                  onClick={() => setRetryCount((value) => value + 1)}
                >
                  다시 시도
                </Button>
              </div>
            ) : filteredBlogs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border py-12 text-center">
                {searchQuery ? (
                  <Search className="mx-auto mb-4 h-8 w-8 text-muted-foreground" />
                ) : (
                  <Bookmark className="mx-auto mb-4 h-8 w-8 text-muted-foreground" />
                )}
                <h2 className="text-lg font-semibold">
                  {searchQuery
                    ? "검색 결과가 없습니다"
                    : "아직 저장한 글이 없습니다"}
                </h2>
                <p className="mb-5 mt-2 text-sm text-muted-foreground">
                  {searchQuery
                    ? "다른 검색어로 찾아보세요."
                    : "관심 있는 글의 북마크 버튼을 눌러보세요."}
                </p>
                {searchQuery ? (
                  <Button variant="outline" onClick={() => setSearchQuery("")}>
                    검색 초기화
                  </Button>
                ) : (
                  <Button asChild>
                    <Link href="/">글 둘러보기</Link>
                  </Button>
                )}
              </div>
            ) : (
              <div
                className={
                  viewMode === "gallery"
                    ? "grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
                    : "space-y-3"
                }
              >
                {filteredBlogs.map((blog) =>
                  viewMode === "gallery" ? (
                    <BlogCard
                      key={blog.id}
                      blog={blog}
                      onLoginClick={handleLoginClick}
                      onBookmarkRemoved={() => handleBookmarkRemoved(blog.id)}
                    />
                  ) : (
                    <BlogListItem
                      key={blog.id}
                      blog={blog}
                      onLoginClick={handleLoginClick}
                      onBookmarkRemoved={() => handleBookmarkRemoved(blog.id)}
                    />
                  ),
                )}
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
