"use client";

import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, User, Globe } from "lucide-react";
import Image from "next/image";
import { fetchAvailableBlogs } from "@/lib/supabase";
import { getLogoUrl } from "@/lib/logos";

interface BlogSelectorProps {
  selectedBlog: string;
  onBlogChange: (blog: string) => void;
  blogType: "company" | "personal";
  className?: string;
}

interface Blog {
  author: string;
  blog_type: "company" | "personal";
  category?: "FE" | "BE" | "AI" | "APP" | null;
}

export function BlogSelector({
  selectedBlog,
  onBlogChange,
  blogType,
  className = "",
}: BlogSelectorProps) {
  const [blogs, setBlogs] = useState<{
    companies: Blog[];
    individuals: Blog[];
  }>({ companies: [], individuals: [] });
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const loadBlogs = async () => {
      try {
        setLoading(true);
        const availableBlogs = await fetchAvailableBlogs();
        setBlogs(availableBlogs);
      } catch (error) {
        console.error("블로그 목록 로드 실패:", error);
        setBlogs({ companies: [], individuals: [] });
      } finally {
        setLoading(false);
      }
    };

    loadBlogs();
  }, [mounted]);

  const getAvailableBlogs = () => {
    if (blogType === "company") {
      return blogs.companies;
    } else {
      return blogs.individuals;
    }
  };

  const availableBlogs = getAvailableBlogs();

  if (!mounted) {
    return (
      <Select value={selectedBlog} onValueChange={onBlogChange} disabled>
        <SelectTrigger
          className={`w-full sm:w-[200px] rounded-xl border-border/50 hover:border-primary/50 transition-all duration-200 ${className}`}
        >
          <SelectValue placeholder="로딩 중..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="loading">로딩 중...</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Select value={selectedBlog} onValueChange={onBlogChange}>
      <SelectTrigger
        className={`w-full sm:w-[200px] rounded-xl border-border/50 hover:border-primary/50 transition-all duration-200 ${className}`}
        disabled={loading}
      >
        <SelectValue placeholder={loading ? "로딩 중..." : "전체 블로그"} />
      </SelectTrigger>
      <SelectContent className="rounded-xl border-border/50 max-h-[300px]">
        <SelectItem value="all">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            전체 블로그
          </div>
        </SelectItem>

        {availableBlogs.map((blog) => {
          const logoUrl = getLogoUrl(blog.author);

          return (
            <SelectItem key={blog.author} value={blog.author}>
              <div className="flex items-center gap-2">
                {blog.blog_type === "company" && logoUrl ? (
                  <Image
                    src={logoUrl}
                    alt="logo"
                    width={16}
                    height={16}
                    className="rounded"
                  />
                ) : blog.blog_type === "company" ? (
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="flex-1">{blog.author}</span>
                {blog.blog_type === "personal" && blog.category && (
                  <span className="text-xs text-muted-foreground leading-none flex items-center">
                    {blog.category}
                  </span>
                )}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
