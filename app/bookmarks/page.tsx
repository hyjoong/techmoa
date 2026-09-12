"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getBookmarkedBlogs, type BookmarkedBlog } from "@/lib/bookmarks";
import { BlogCard } from "@/components/blog-card";
import { BlogListItem } from "@/components/blog-list-item";
import { BookmarkSkeleton } from "@/components/bookmark-skeleton";
import { SearchBar } from "@/components/search-bar";
import { Bookmark, BookOpen, Grid3X3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function BookmarksPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [bookmarkedBlogs, setBookmarkedBlogs] = useState<BookmarkedBlog[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [searchQuery, setSearchQuery] = useState("");

  // 북마크된 블로그 가져오기
  const fetchBookmarkedBlogs = async () => {
    try {
      const { blogs, error } = await getBookmarkedBlogs();
      if (error) throw error;
      setBookmarkedBlogs(blogs || []);
    } catch (error: any) {
      console.error("북마크된 블로그 가져오기 실패:", error);
      toast({
        title: "오류",
        description: "북마크된 글을 가져오는데 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 북마크 제거 시 목록에서 제거
  const handleBookmarkRemoved = (blogId: number) => {
    setBookmarkedBlogs((prev) => prev.filter((blog) => blog.id !== blogId));
  };

  useEffect(() => {
    // 인증 상태가 로딩 중이면 스켈레톤 표시
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (isAuthenticated) {
      setLoading(true);
      fetchBookmarkedBlogs();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  // 필터링된 블로그 목록 (검색만)
  const filteredBlogs = bookmarkedBlogs.filter((blog) => {
    const matchesSearch =
      blog.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      blog.summary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      blog.author?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  // 최신순으로 정렬
  const sortedBlogs = [...filteredBlogs].sort((a, b) => {
    return (
      new Date(b.published_at || b.created_at).getTime() -
      new Date(a.published_at || a.created_at).getTime()
    );
  });

  // 인증 상태가 로딩 중이면 스켈레톤 표시
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button className="hover:opacity-80 transition-opacity">
                  <a href="/">
                    <h1 className="text-2xl font-black text-blue-600 dark:text-blue-400">
                      Techmoa
                    </h1>
                  </a>
                </button>
                <div className="flex items-center gap-2">
                  <Bookmark className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                    북마크
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-6">
          <BookmarkSkeleton viewMode={viewMode} count={6} />
        </div>
      </div>
    );
  }

  // 로그인하지 않은 경우
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <button className="hover:opacity-80 transition-opacity">
                <a href="/">
                  <h1 className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    Techmoa
                  </h1>
                </a>
              </button>
              <div className="flex items-center gap-2">
                <Bookmark className="h-5 w-5 text-yellow-500" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  북마크
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="p-8 text-center">
              <BookOpen className="h-16 w-16 mx-auto mb-4 text-slate-400" />
              <h2 className="text-2xl font-bold mb-2">북마크</h2>
              <p className="text-slate-600 mb-6">
                로그인하여 북마크한 글들을 확인하세요.
              </p>
              <Button asChild>
                <a href="/">홈으로 돌아가기</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 헤더 */}
      <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button className="hover:opacity-80 transition-opacity">
                <a href="/">
                  <h1 className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    Techmoa
                  </h1>
                </a>
              </button>
              <div className="flex items-center gap-2">
                <Bookmark className="h-5 w-5 text-yellow-500" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  북마크
                </span>
              </div>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              총 {sortedBlogs.length}개
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* 컨트롤 바 */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <SearchBar
              value={searchQuery || ""}
              onChange={setSearchQuery}
              placeholder="북마크한 글 검색..."
            />
          </div>
          <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
            <Button
              variant={viewMode === "card" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("card")}
              className="flex items-center gap-2"
            >
              <Grid3X3 className="h-4 w-4" />
              <span className="hidden sm:inline">갤러리</span>
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="flex items-center gap-2"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">목록</span>
            </Button>
          </div>
        </div>

        {/* 로딩 상태 */}
        {loading && (
          <div>
            <BookmarkSkeleton viewMode={viewMode} count={6} />
          </div>
        )}

        {/* 북마크된 글 목록 */}
        {!loading && sortedBlogs.length === 0 && (
          <Card className="text-center py-12">
            <CardContent>
              <Bookmark className="h-16 w-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-xl font-semibold mb-2">
                북마크된 글이 없습니다
              </h3>
              <p className="text-slate-600 mb-4">
                관심 있는 글에 북마크를 추가해보세요.
              </p>
              <Button asChild>
                <a href="/">홈으로 돌아가기</a>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 북마크된 글들 */}
        {!loading && sortedBlogs.length > 0 && (
          <div
            className={
              viewMode === "card"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
            }
          >
            {sortedBlogs.map((blog) =>
              viewMode === "card" ? (
                <BlogCard
                  key={blog.id}
                  blog={blog}
                  onLoginClick={() => {}} // 북마크 페이지에서는 로그인 모달이 필요 없음
                  onBookmarkRemoved={() => handleBookmarkRemoved(blog.id)}
                />
              ) : (
                <BlogListItem
                  key={blog.id}
                  blog={blog}
                  onLoginClick={() => {}} // 북마크 페이지에서는 로그인 모달이 필요 없음
                  onBookmarkRemoved={() => handleBookmarkRemoved(blog.id)}
                />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
