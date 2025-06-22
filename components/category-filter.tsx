"use client"

import { Button } from "@/components/ui/button"

interface Category {
  id: string
  label: string
  value: string
}

interface CategoryFilterProps {
  categories: Category[]
  selectedCategory: string
  onCategoryChange: (category: string) => void
}

export function CategoryFilter({ categories, selectedCategory, onCategoryChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => (
        <Button
          key={category.id}
          variant={selectedCategory === category.value ? "default" : "outline"}
          size="sm"
          onClick={() => onCategoryChange(category.value)}
          className={`transition-all duration-200 ${
            selectedCategory === category.value
              ? "shadow-md"
              : "bg-background text-foreground hover:bg-muted hover:shadow-sm"
          }`}
        >
          {category.label}
        </Button>
      ))}
    </div>
  )
}
