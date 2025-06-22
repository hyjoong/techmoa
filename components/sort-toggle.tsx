"use client"

import { Button } from "@/components/ui/button"
import { Clock, TrendingUp } from "lucide-react"

interface SortToggleProps {
  sortBy: "latest" | "popular"
  onSortChange: (sort: "latest" | "popular") => void
}

export function SortToggle({ sortBy, onSortChange }: SortToggleProps) {
  return (
    <div className="flex gap-2">
      <Button
        variant={sortBy === "latest" ? "default" : "outline"}
        size="sm"
        onClick={() => onSortChange("latest")}
        className={`flex items-center gap-2 transition-all duration-200 ${
          sortBy !== "latest" ? "bg-background text-foreground hover:bg-muted hover:shadow-sm" : "shadow-md"
        }`}
      >
        <Clock className="h-4 w-4" />
        최신순
      </Button>
      <Button
        variant={sortBy === "popular" ? "default" : "outline"}
        size="sm"
        onClick={() => onSortChange("popular")}
        className={`flex items-center gap-2 transition-all duration-200 ${
          sortBy !== "popular" ? "bg-background text-foreground hover:bg-muted hover:shadow-sm" : "shadow-md"
        }`}
      >
        <TrendingUp className="h-4 w-4" />
        인기순
      </Button>
    </div>
  )
}
