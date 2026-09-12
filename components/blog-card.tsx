"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BookmarkButton } from "@/components/bookmark-button";
import { Badge } from "@/components/ui/badge";

import { Building2, Calendar, Eye, User } from "lucide-react";
import Image from "next/image";
import { incrementViews, type Blog } from "@/lib/supabase";
import { getLogoUrl } from "@/lib/logos";
import { memo, useCallback, useState } from "react";
import { formatBlogDate, formatViews } from "@/lib/format";

interface BlogCardProps {
  blog: Blog;
  onLoginClick: () => void;
  onBookmarkRemoved?: () => void;
  selectedSubTags?: string[];
  onTagClick?: (tag: string) => void;
}

function BlogCardComponent({
  blog,
  onLoginClick,
  onBookmarkRemoved,
  selectedSubTags = [],
  onTagClick,
}: BlogCardProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleLinkClick = useCallback(() => {
    // 조회수 증가 (백그라운드에서 실행)
    try {
      incrementViews(blog.id);
    } catch (error) {
      console.error("조회수 증가 실패:", error);
    }
    // 링크의 기본 동작을 허용 (새 탭에서 열기)
  }, [blog.id]);

  // 썸네일 표시 여부 결정
  const shouldShowThumbnail = blog.thumbnail_url && !imageError;
  const logoUrl = getLogoUrl(blog.author);

  return (
    <article className="relative group h-full">
      <Card className="h-full flex flex-col cursor-pointer card-hover border border-border shadow-sm hover:shadow-md bg-card rounded-xl overflow-hidden">
        {shouldShowThumbnail && (
          <CardHeader className="p-0">
            <div className="relative aspect-[2/1] overflow-hidden rounded-t-xl bg-muted">
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 animate-pulse" />
              )}
              <Image
                src={blog.thumbnail_url!}
                alt={blog.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
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

        <CardContent className="p-5 flex-1 flex flex-col">
          <h3 className="font-semibold text-lg mb-2 pr-7 line-clamp-2 group-hover:text-primary transition-colors duration-200">
            <a
              href={blog.external_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleLinkClick}
              className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring"
            >
              {blog.title}
            </a>
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

          <p className="text-muted-foreground text-sm mb-4 line-clamp-2 flex-1 leading-relaxed">
            {blog.summary || "요약이 없습니다."}
          </p>

          {blog.tags && blog.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {blog.tags.slice(0, 3).map((tag) => {
                const isHighlighted =
                  selectedSubTags.length > 0 && selectedSubTags.includes(tag);
                return onTagClick ? (
                  <button
                    key={tag}
                    type="button"
                    className={`relative z-10 min-h-8 rounded-full border px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isHighlighted ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/50 text-muted-foreground hover:border-primary hover:text-primary"}`}
                    aria-pressed={isHighlighted}
                    onClick={() => onTagClick(tag)}
                  >
                    {tag}
                  </button>
                ) : (
                  <Badge key={tag} variant="secondary" className="font-normal">
                    {tag}
                  </Badge>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/30 dark:border-border/50">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatBlogDate(blog.published_at)}
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {formatViews(blog.views)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 북마크 버튼 */}
      <div className="absolute top-3 right-3 z-10">
        <BookmarkButton
          blogId={blog.id}
          onLoginClick={onLoginClick}
          onBookmarkRemoved={onBookmarkRemoved}
        />
      </div>
    </article>
  );
}

export const BlogCard = memo(BlogCardComponent);
