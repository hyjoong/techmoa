"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { Calendar, Eye, User } from "lucide-react";
import Image from "next/image";
import { incrementViews, type Blog } from "@/lib/supabase";
// import { CompanyLogo } from "./company-logo";

interface BlogCardProps {
  blog: Blog;
}

export function BlogCard({ blog }: BlogCardProps) {
  const handleCardClick = async (e: React.MouseEvent) => {
    // 버튼이나 드롭다운 클릭 시에는 카드 클릭 이벤트를 실행하지 않음
    if ((e.target as HTMLElement).closest('button, [role="button"]')) {
      return;
    }

    try {
      await incrementViews(blog.id);
      window.open(blog.external_url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("조회수 증가 실패:", error);
      window.open(blog.external_url, "_blank", "noopener,noreferrer");
    }
  };

  const handleButtonClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // 이벤트 전파 방지
    try {
      await incrementViews(blog.id);
      window.open(blog.external_url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("조회수 증가 실패:", error);
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

  return (
    <Card
      className="group h-full flex flex-col cursor-pointer card-hover border-0 shadow-lg hover:shadow-xl bg-card/50 backdrop-blur-sm"
      onClick={handleCardClick}
    >
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
              // <CompanyLogo
              //   companyName={blog.author}
              //   size={16}
              //   className="flex-shrink-0"
              // />
              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
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

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
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
  );
}
