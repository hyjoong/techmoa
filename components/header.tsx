import { BlogTypeToggle } from "@/components/blog-type-toggle";
import { BlogSelector } from "@/components/blog-selector";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/auth/user-menu";
import type { BlogType } from "@/hooks/use-url-filters";

interface HeaderProps {
  blogType: BlogType;
  selectedBlog: string;
  hasActiveFilters: boolean;
  onBlogTypeChange: (type: BlogType) => void;
  onBlogChange: (blog: string) => void;
  onClearFilters: () => void;
  onLogoClick: () => void;
  onLoginClick: () => void;
}

export function Header({
  blogType,
  selectedBlog,
  hasActiveFilters,
  onBlogTypeChange,
  onBlogChange,
  onClearFilters,
  onLogoClick,
  onLoginClick,
}: HeaderProps) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 border-b border-slate-200/50 dark:border-slate-700/50">
      <div className="container mx-auto px-4 py-3">
        {/* 데스크톱 레이아웃 */}
        <div className="hidden sm:flex sm:items-center justify-between gap-3">
          {/* 로고 */}
          <button
            onClick={onLogoClick}
            className="hover:opacity-80 transition-opacity"
          >
            <h1 className="text-2xl font-black text-blue-600 dark:text-blue-400">
              Techmoa
            </h1>
          </button>

          {/* 필터들 */}
          <div className="flex items-center gap-3">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                <span>초기화</span>
              </Button>
            )}
            <BlogTypeToggle
              blogType={blogType}
              onBlogTypeChange={onBlogTypeChange}
            />
            <BlogSelector
              selectedBlog={selectedBlog}
              onBlogChange={onBlogChange}
              blogType={blogType}
            />
            <ThemeToggle />
            <UserMenu onLoginClick={onLoginClick} />
          </div>
        </div>

        {/* 모바일 레이아웃 */}
        <div className="sm:hidden">
          {/* 첫 번째 줄: 로고와 테마 */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={onLogoClick}
              className="hover:opacity-80 transition-opacity"
            >
              <h1 className="text-xl font-black text-blue-600 dark:text-blue-400">
                Techmoa
              </h1>
            </button>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <UserMenu onLoginClick={onLoginClick} />
            </div>
          </div>

          {/* 두 번째 줄: 필터들 */}
          <div className="flex items-center justify-between gap-2">
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="sr-only">초기화</span>
              </Button>
            )}
            <BlogTypeToggle
              blogType={blogType}
              onBlogTypeChange={onBlogTypeChange}
            />
            <BlogSelector
              selectedBlog={selectedBlog}
              onBlogChange={onBlogChange}
              blogType={blogType}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
