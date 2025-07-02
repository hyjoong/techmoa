"use client";

import { Button } from "@/components/ui/button";
import { Grid3X3, List, Github } from "lucide-react";
import { SearchBar } from "./search-bar";

interface ViewToggleProps {
  viewMode: "gallery" | "list";
  onViewModeChange: (mode: "gallery" | "list") => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ViewToggle({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
}: ViewToggleProps) {
  return (
    <div className="flex items-center justify-between gap-4 w-full">
      {/* 왼쪽: 검색바 */}
      <div className="flex-1 max-w-md">
        <SearchBar
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="블로그 검색..."
        />
      </div>

      {/* 오른쪽: 뷰 토글과 깃허브 링크 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
          <Button
            variant={viewMode === "gallery" ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("gallery")}
            className="flex items-center gap-2"
          >
            <Grid3X3 className="h-4 w-4" />
            <span className="hidden sm:inline">갤러리</span>
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="sm"
            onClick={() => onViewModeChange("list")}
            className="flex items-center gap-2"
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">목록</span>
          </Button>
        </div>
        <a
          href="https://github.com/hyjoong/techmoa"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
          title="GitHub"
        >
          <Github className="h-4 w-4 text-slate-700 dark:text-slate-300" />
        </a>
      </div>
    </div>
  );
}
