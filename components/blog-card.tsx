"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BookmarkButton } from "@/components/bookmark-button";

import { Building2, Calendar, Eye, User } from "lucide-react";
import Image from "next/image";
import { incrementViews, type Blog } from "@/lib/supabase";
import { getLogoUrl } from "@/lib/logos";
import { useState } from "react";
import { isFlutterWebView } from "@/lib/webview-bridge";

interface BlogCardProps {
  blog: Blog;
  onLoginClick: () => void;
  onBookmarkRemoved?: () => void;
}

export function BlogCard({
  blog,
  onLoginClick,
  onBookmarkRemoved,
}: BlogCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleLinkClick = async (e: React.MouseEvent) => {
    e.preventDefault();

    try {
      // 조회수 증가 (최대 1초 대기)
      await Promise.race([
        incrementViews(blog.id),
        new Promise((resolve) => setTimeout(resolve, 1000)),
      ]);
    } catch (error) {
      console.error("조회수 증가 실패:", error);
    } finally {
      // 성공/실패와 관계없이 항상 링크 열기
      window.open(blog.external_url, "_blank", "noopener,noreferrer");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatViews = (views: number) => {
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}k`;
    }
    return views.toString();
  };

  // 썸네일 표시 여부 결정
  const shouldShowThumbnail = blog.thumbnail_url && !imageError;
  const logoUrl = getLogoUrl(blog.author);

  return (
    <div className="relative group h-full">
      <a
        href={blog.external_url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleLinkClick}
        className="block h-full"
      >
        <Card className="h-full flex flex-col cursor-pointer card-hover border border-border/20 shadow-lg hover:shadow-xl bg-card dark:bg-card/80 backdrop-blur-sm dark:backdrop-blur-none rounded-xl overflow-hidden">
          {shouldShowThumbnail && (
            <CardHeader className="p-0">
              <div className="relative aspect-video overflow-hidden rounded-t-xl bg-muted">
                {!imageLoaded && (
                  <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 animate-pulse" />
                )}
                <Image
                  src={blog.thumbnail_url!}
                  alt={blog.title}
                  fill
                  className={`object-cover group-hover:scale-105 transition-all duration-300 ${
                    imageLoaded ? "opacity-100" : "opacity-0"
                  }`}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => {
                    console.log(`썸네일 로드 실패: ${blog.thumbnail_url}`);
                    setImageError(true);
                  }}
                />
                {imageLoaded && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                )}
              </div>
            </CardHeader>
          )}

          <CardContent className="p-6 flex-1 flex flex-col">
            <h3 className="font-semibold text-lg mb-3 line-clamp-2 group-hover:text-primary transition-colors duration-200">
              {blog.title}
            </h3>

            {/* 작성자 정보 */}
            {blog.author && (
              <div
                className={`flex items-center gap-2 mb-3 text-sm ${
                  blog.blog_type === "personal"
                    ? "text-primary font-medium"
                    : "text-muted-foreground"
                }`}
              >
                {blog.blog_type === "company" && logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt="logo"
                    width={20}
                    height={20}
                    className="rounded"
                  />
                ) : blog.blog_type === "company" ? (
                  <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <User className="h-4 w-4 text-primary flex-shrink-0" />
                )}
                <span
                  className={`${
                    blog.blog_type === "personal" ? "font-medium" : ""
                  } truncate`}
                >
                  {blog.author}
                </span>
                {blog.blog_type === "personal" && blog.category && (
                  <span className="text-xs text-muted-foreground">
                    {blog.category}
                  </span>
                )}
              </div>
            )}

            <p className="text-muted-foreground text-sm mb-4 line-clamp-3 flex-1 leading-relaxed">
              {blog.summary || "요약이 없습니다."}
            </p>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/30 dark:border-border/50">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(blog.published_at)}
                </div>
                <div className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {formatViews(blog.views)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </a>

      {/* 북마크 버튼 */}
      <div
        className={`absolute top-3 right-3 transition-opacity duration-200 ${
          isFlutterWebView()
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <BookmarkButton
          blogId={blog.id}
          onLoginClick={onLoginClick}
          onBookmarkRemoved={onBookmarkRemoved}
        />
      </div>
    </div>
  );
}
