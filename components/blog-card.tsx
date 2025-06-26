"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar,
  Eye,
  ExternalLink,
  Tag,
  MoreVertical,
  Edit,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { deleteBlog, incrementViews, type Blog } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

interface BlogCardProps {
  blog: Blog;
  searchQuery?: string;
  onEdit: (blog: Blog) => void;
  onDeleted: () => void;
}

export function BlogCard({
  blog,
  searchQuery = "",
  onEdit,
  onDeleted,
}: BlogCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  const handleCardClick = async () => {
    try {
      await incrementViews(blog.id);
      window.open(blog.external_url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("조회수 증가 실패:", error);
      window.open(blog.external_url, "_blank", "noopener,noreferrer");
    }
  };

  const handleDelete = async () => {
    if (!confirm("정말로 이 블로그를 삭제하시겠습니까?")) return;

    try {
      setIsDeleting(true);
      await deleteBlog(blog.id);
      onDeleted();
    } catch (error) {
      console.error("삭제 실패:", error);
      toast({
        title: "오류",
        description: "블로그 삭제에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
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

  // 검색어 하이라이팅 함수
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const regex = new RegExp(
      `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi"
    );
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark
          key={index}
          className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group h-full flex flex-col">
      <CardHeader className="p-0">
        {blog.thumbnail_url && (
          <div className="relative aspect-video overflow-hidden rounded-t-lg">
            <Image
              src={blog.thumbnail_url}
              alt={blog.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
              onError={(e) => {
                // 썸네일 로드 실패 시 기본 이미지로 대체
                const target = e.target as HTMLImageElement;
                target.src = "/placeholder.jpg";
              }}
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-end mb-3">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCardClick}
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(blog)}>
                  <Edit className="h-4 w-4 mr-2" />
                  수정
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? "삭제 중..." : "삭제"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <h3
          className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors cursor-pointer"
          onClick={handleCardClick}
        >
          {highlightText(blog.title, searchQuery)}
        </h3>

        <p className="text-muted-foreground text-sm mb-3 line-clamp-3 flex-1">
          {blog.summary
            ? highlightText(blog.summary, searchQuery)
            : "요약이 없습니다."}
        </p>

        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground">
            {highlightText(blog.author, searchQuery)}
          </div>

          {/* 태그 표시 (제거할 예정)*/}
          {/* {blog.tags && blog.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {blog.tags.slice(0, 3).map((tag, index) => (
                <div
                  key={index}
                  className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground px-2 py-1 rounded-md"
                >
                  <Tag className="h-3 w-3" />
                  {highlightText(tag, searchQuery)}
                </div>
              ))}
              {blog.tags.length > 3 && (
                <div className="text-xs text-muted-foreground px-2 py-1">
                  +{blog.tags.length - 3}
                </div>
              )}
            </div>
          )} */}
        </div>
      </CardContent>

      <CardFooter className="px-4 pb-4 pt-0">
        <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(blog.published_at)}
          </div>
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {formatViews(blog.views)}
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
