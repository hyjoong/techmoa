"use client";

import { Card, CardContent } from "@/components/ui/card";
import { BookmarkButton } from "@/components/bookmark-button";
import { Building2, Calendar, Eye, User } from "lucide-react";
import Image from "next/image";
import { incrementViews, type Blog } from "@/lib/supabase";
import { getLogoUrl } from "@/lib/logos";
import { useState } from "react";

interface BlogListItemProps {
  blog: Blog;
  onLoginClick: () => void;
}

export function BlogListItem({ blog, onLoginClick }: BlogListItemProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleLinkClick = async (e: React.MouseEvent) => {
    // 조회수 증가 (백그라운드에서 실행)
    try {
      incrementViews(blog.id);
    } catch (error) {
      console.error("조회수 증가 실패:", error);
    }
    // 링크의 기본 동작을 허용 (새 탭에서 열기)
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
    <div className="relative group">
      <a
        href={blog.external_url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleLinkClick}
        className="block"
      >
      <Card className="cursor-pointer card-hover border border-border/20 shadow-sm hover:shadow-md bg-card dark:bg-card/80 backdrop-blur-sm dark:backdrop-blur-none rounded-lg overflow-hidden">
        <CardContent className="p-6">
          <div className="flex gap-6">
            {/* 썸네일 영역: 모바일에서는 숨김 */}
            {shouldShowThumbnail && (
              <div className="hidden sm:block relative w-48 h-32 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
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
              </div>
            )}

            {/* 콘텐츠 영역 */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-xl mb-3 group-hover:text-primary transition-colors duration-200 line-clamp-2">
                {blog.title}
              </h3>

              <p className="text-muted-foreground text-base mb-4 line-clamp-2 leading-relaxed">
                {blog.summary || "요약이 없습니다."}
              </p>

              {/* 메타 정보 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* 작성자 정보 */}
                  {blog.author && (
                    <div
                      className={`flex items-center gap-2 text-sm ${
                        blog.blog_type === "personal"
                          ? "text-primary font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      {blog.blog_type === "company" && logoUrl ? (
                        <Image
                          src={logoUrl}
                          alt="logo"
                          width={16}
                          height={16}
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
                    </div>
                  )}

                  {/* 날짜 */}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {formatDate(blog.published_at)}
                  </div>

                  {/* 조회수 */}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Eye className="h-4 w-4" />
                    {formatViews(blog.views)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </a>
      
      {/* 북마크 버튼 */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <BookmarkButton blogId={blog.id} onLoginClick={onLoginClick} />
      </div>
    </div>
  );
}
