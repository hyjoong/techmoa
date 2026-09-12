"use client";

import { Button } from "@/components/ui/button";
import { Grid3X3, List } from "lucide-react";

interface ViewToggleProps {
  viewMode: "gallery" | "list";
  onViewModeChange: (mode: "gallery" | "list") => void;
}

export function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
    <div
      className="flex shrink-0 items-center gap-1 rounded-lg bg-muted p-1"
      role="group"
      aria-label="글 보기 방식"
    >
      <Button
        variant={viewMode === "gallery" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onViewModeChange("gallery")}
        aria-label="갤러리 보기"
        aria-pressed={viewMode === "gallery"}
        className={
          viewMode === "gallery" ? "bg-card shadow-sm" : "text-muted-foreground"
        }
      >
        <Grid3X3 className="h-4 w-4" />
        <span className="ml-2 hidden sm:inline">갤러리</span>
      </Button>
      <Button
        variant={viewMode === "list" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => onViewModeChange("list")}
        aria-label="목록 보기"
        aria-pressed={viewMode === "list"}
        className={
          viewMode === "list" ? "bg-card shadow-sm" : "text-muted-foreground"
        }
      >
        <List className="h-4 w-4" />
        <span className="ml-2 hidden sm:inline">목록</span>
      </Button>
    </div>
  );
}
