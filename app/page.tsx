"use client";

import { useCallback, useEffect, useState } from "react";
import { Header } from "@/components/header";
import { MainContent } from "@/components/main-content";
import { WeeklyPopular } from "@/components/weekly-popular";
import { Footer } from "@/components/footer";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { useInfiniteBlogData } from "@/hooks/use-infinite-blog-data";
import { type Blog, fetchWeeklyPopularBlogs } from "@/lib/supabase";
import { openAuthModal } from "@/components/auth/open-auth-modal";

export default function HomePage() {
  const [popularBlogs, setPopularBlogs] = useState<Blog[]>([]);
  const [popularLoading, setPopularLoading] = useState(true);
  const [popularError, setPopularError] = useState(false);
  const [popularRetry, setPopularRetry] = useState(0);
  const [isWeeklyExpanded, setIsWeeklyExpanded] = useState(true);
  const filters = useUrlFilters();
  const {
    blogType,
    selectedBlog,
    sortBy,
    searchQuery,
    tagCategory,
    selectedSubTags,
  } = filters;
  const data = useInfiniteBlogData({
    blogType,
    selectedBlog,
    sortBy,
    searchQuery,
    tagCategory,
    selectedSubTags,
  });

  useEffect(() => {
    let active = true;
    setPopularLoading(true);
    setPopularError(false);
    void fetchWeeklyPopularBlogs(10)
      .then((blogs) => {
        if (active) setPopularBlogs(blogs);
      })
      .catch(() => {
        if (active) setPopularError(true);
      })
      .finally(() => {
        if (active) setPopularLoading(false);
      });
    return () => {
      active = false;
    };
  }, [popularRetry]);

  const handleLoginClick = useCallback(() => {
    openAuthModal();
  }, []);
  const popularProps = {
    blogs: popularBlogs,
    loading: popularLoading,
    error: popularError,
    onRetry: () => setPopularRetry((value) => value + 1),
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <a
        href="#main-content"
        className="sr-only z-50 rounded bg-background p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        본문으로 바로가기
      </a>
      <Header onLoginClick={handleLoginClick} />
      <div className="container mx-auto flex flex-1 items-start gap-8 px-4 py-6 sm:py-8">
        <MainContent
          data={data}
          filters={filters}
          isWeeklyExpanded={isWeeklyExpanded}
          onWeeklyToggle={() => setIsWeeklyExpanded(true)}
          onLoginClick={handleLoginClick}
          popularContent={<WeeklyPopular {...popularProps} compact />}
        />
        {isWeeklyExpanded && (
          <WeeklyPopular
            {...popularProps}
            onCollapse={() => setIsWeeklyExpanded(false)}
          />
        )}
      </div>
      <Footer />
    </div>
  );
}
