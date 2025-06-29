"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { Building2, Calendar, Eye, User } from "lucide-react";
import Image from "next/image";
import { incrementViews, type Blog } from "@/lib/supabase";
// import { CompanyLogo } from "./company-logo";

interface BlogCardProps {
  blog: Blog;
}

export function BlogCard({ blog }: BlogCardProps) {
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

  return (
    <a
      href={blog.external_url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleLinkClick}
      className="block group h-full"
    >
      <Card className="h-full flex flex-col cursor-pointer card-hover border border-border/20 shadow-lg hover:shadow-xl bg-card dark:bg-card/80 backdrop-blur-sm dark:backdrop-blur-none rounded-xl overflow-hidden">
        <CardHeader className="p-0">
          {blog.thumbnail_url && (
            <div className="relative aspect-video overflow-hidden rounded-t-xl">
              <Image
                src={blog.thumbnail_url}
                alt={blog.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  // 썸네일 로드 실패 시 기본 이미지로 대체
                  const target = e.target as HTMLImageElement;
                  target.src = "/placeholder.jpg";
                }}
              />
              {/* 오버레이 */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          )}
        </CardHeader>

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
              {blog.blog_type === "company" ? (
                <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              ) : (
                <User className="h-4 w-4 text-primary flex-shrink-0" />
              )}
              <span
                className={`$${
                  blog.blog_type === "personal" ? "font-medium" : ""
                } truncate`}
              >
                {blog.author}
              </span>
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
  );
}
