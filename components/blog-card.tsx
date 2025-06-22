"use client"

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar, Eye, ExternalLink, Tag } from "lucide-react"
import Image from "next/image"

interface Blog {
  id: number
  title: string
  summary: string
  author: string
  category: string
  tags: string[]
  publishedAt: string
  thumbnail?: string
  url: string
  views: number
}

interface BlogCardProps {
  blog: Blog
  searchQuery?: string
}

const categoryColors = {
  frontend: "bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300",
  backend: "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-300",
  infra: "bg-purple-100 text-purple-800 hover:bg-purple-200 dark:bg-purple-900 dark:text-purple-300",
  career: "bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-900 dark:text-orange-300",
}

const categoryLabels = {
  frontend: "프론트엔드",
  backend: "백엔드",
  infra: "인프라",
  career: "커리어",
}

export function BlogCard({ blog, searchQuery = "" }: BlogCardProps) {
  const handleCardClick = () => {
    window.open(blog.url, "_blank", "noopener,noreferrer")
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const formatViews = (views: number) => {
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}k`
    }
    return views.toString()
  }

  // 검색어 하이라이팅 함수
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text

    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi")
    const parts = text.split(regex)

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      ),
    )
  }

  return (
    <Card
      className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1 group h-full flex flex-col"
      onClick={handleCardClick}
    >
      <CardHeader className="p-0">
        {blog.thumbnail && (
          <div className="relative aspect-video overflow-hidden rounded-t-lg">
            <Image
              src={blog.thumbnail || "/placeholder.svg"}
              alt={blog.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-200"
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <Badge variant="secondary" className={categoryColors[blog.category as keyof typeof categoryColors]}>
            {categoryLabels[blog.category as keyof typeof categoryLabels]}
          </Badge>
          <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>

        <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {highlightText(blog.title, searchQuery)}
        </h3>

        <p className="text-muted-foreground text-sm mb-3 line-clamp-3 flex-1">
          {highlightText(blog.summary, searchQuery)}
        </p>

        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground">{highlightText(blog.author, searchQuery)}</div>

          {/* 태그 표시 */}
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
              <div className="text-xs text-muted-foreground px-2 py-1">+{blog.tags.length - 3}</div>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="px-4 pb-4 pt-0">
        <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(blog.publishedAt)}
          </div>
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {formatViews(blog.views)}
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
