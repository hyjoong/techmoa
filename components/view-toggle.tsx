"use client";

import { Button } from "@/components/ui/button";
import { Grid3X3, List } from "lucide-react";

interface ViewToggleProps {
  viewMode: "gallery" | "list";
  onViewModeChange: (mode: "gallery" | "list") => void;
}

export function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
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
  );
}
