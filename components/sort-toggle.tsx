"use client"

import { Button } from "@/components/ui/button"
import { Clock, TrendingUp, Calendar, Type } from "lucide-react"

interface SortToggleProps {
  sortBy: "published_at" | "title" | "created_at" | "views"
  onSortChange: (sort: "published_at" | "title" | "created_at" | "views") => void
}

const sortOptions = [
  { value: "published_at", label: "발행일순", icon: Calendar },
  { value: "created_at", label: "최신순", icon: Clock },
  { value: "views", label: "인기순", icon: TrendingUp },
  { value: "title", label: "제목순", icon: Type },
] as const

export function SortToggle({ sortBy, onSortChange }: SortToggleProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {sortOptions.map((option) => {
        const Icon = option.icon
        return (
          <Button
            key={option.value}
            variant={sortBy === option.value ? "default" : "outline"}
            size="sm"
            onClick={() => onSortChange(option.value)}
            className={`flex items-center gap-2 transition-all duration-200 ${
              sortBy !== option.value ? "bg-background text-foreground hover:bg-muted hover:shadow-sm" : "shadow-md"
            }`}
          >
            <Icon className="h-4 w-4" />
            {option.label}
          </Button>
        )
      })}
    </div>
  )
}
