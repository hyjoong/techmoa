"use client"

import { useState, useMemo } from "react"
import { SearchBar } from "@/components/search-bar"
import { CategoryFilter } from "@/components/category-filter"
import { SortToggle } from "@/components/sort-toggle"
import { BlogCard } from "@/components/blog-card"
import { NavigationBar } from "@/components/navigation-bar"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

// 더미 데이터 - 실제 환경에서는 props나 API로 받아올 데이터
const mockBlogs = [
  {
    id: 1,
    title: "React 18의 새로운 기능들과 Concurrent Features 완벽 가이드",
    summary:
      "React 18에서 도입된 Concurrent Features와 Suspense, useTransition 등의 새로운 훅들을 실제 예제와 함께 살펴봅니다. 성능 최적화와 사용자 경험 개선을 위한 핵심 개념들을 다룹니다.",
    author: "김개발",
    category: "frontend",
    tags: ["React", "JavaScript", "성능최적화", "Concurrent"],
    publishedAt: "2024-01-15",
    thumbnail: "/placeholder.svg?height=200&width=300",
    url: "https://example.com/blog/1",
    views: 1250,
  },
  {
    id: 2,
    title: "Node.js 성능 최적화: 메모리 누수 방지와 클러스터링",
    summary:
      "Node.js 애플리케이션의 성능을 향상시키기 위한 메모리 관리 기법과 클러스터링 전략을 다룹니다. 실제 프로덕션 환경에서 겪을 수 있는 문제들과 해결책을 제시합니다.",
    author: "박백엔드",
    category: "backend",
    tags: ["Node.js", "성능최적화", "메모리관리", "클러스터링"],
    publishedAt: "2024-01-14",
    thumbnail: "/placeholder.svg?height=200&width=300",
    url: "https://example.com/blog/2",
    views: 890,
  },
  {
    id: 3,
    title: "Kubernetes 운영 환경에서의 모니터링과 로깅 전략",
    summary:
      "프로덕션 환경에서 Kubernetes 클러스터를 효과적으로 모니터링하고 로그를 관리하는 방법을 소개합니다. Prometheus, Grafana, ELK 스택을 활용한 실무 가이드입니다.",
    author: "이인프라",
    category: "infra",
    tags: ["Kubernetes", "모니터링", "로깅", "DevOps"],
    publishedAt: "2024-01-13",
    thumbnail: "/placeholder.svg?height=200&width=300",
    url: "https://example.com/blog/3",
    views: 2100,
  },
  {
    id: 4,
    title: "개발자 커리어 전환기: 스타트업에서 대기업으로",
    summary:
      "5년차 개발자가 스타트업에서 대기업으로 이직하면서 겪은 경험과 준비 과정을 공유합니다. 면접 준비부터 문화 적응까지의 실제 경험담을 담았습니다.",
    author: "최커리어",
    category: "career",
    tags: ["이직", "커리어", "면접", "경험담"],
    publishedAt: "2024-01-12",
    thumbnail: "/placeholder.svg?height=200&width=300",
    url: "https://example.com/blog/4",
    views: 3200,
  },
  {
    id: 5,
    title: "TypeScript 5.0 새로운 기능과 마이그레이션 가이드",
    summary:
      "TypeScript 5.0의 주요 변경사항과 기존 프로젝트를 업그레이드하는 방법을 단계별로 설명합니다. 새로운 타입 시스템 기능과 성능 개선사항을 중심으로 다룹니다.",
    author: "정타입",
    category: "frontend",
    tags: ["TypeScript", "마이그레이션", "타입시스템"],
    publishedAt: "2024-01-11",
    thumbnail: "/placeholder.svg?height=200&width=300",
    url: "https://example.com/blog/5",
    views: 1800,
  },
  {
    id: 6,
    title: "Docker 컨테이너 보안: 베스트 프랙티스와 취약점 대응",
    summary:
      "Docker 컨테이너 환경에서 보안을 강화하기 위한 실무 가이드와 주요 취약점 대응 방법을 다룹니다. 이미지 스캐닝부터 런타임 보안까지 포괄적으로 설명합니다.",
    author: "한보안",
    category: "infra",
    tags: ["Docker", "보안", "컨테이너", "취약점"],
    publishedAt: "2024-01-10",
    thumbnail: "/placeholder.svg?height=200&width=300",
    url: "https://example.com/blog/6",
    views: 1450,
  },
  {
    id: 7,
    title: "Next.js 14 App Router 완벽 가이드: SSR부터 ISR까지",
    summary:
      "Next.js 14의 App Router를 활용한 현대적인 웹 애플리케이션 개발 방법을 다룹니다. Server Components, Client Components, 그리고 새로운 렌더링 전략을 실습과 함께 학습합니다.",
    author: "김개발",
    category: "frontend",
    tags: ["Next.js", "App Router", "SSR", "React"],
    publishedAt: "2024-01-09",
    thumbnail: "/placeholder.svg?height=200&width=300",
    url: "https://example.com/blog/7",
    views: 2800,
  },
  {
    id: 8,
    title: "Python FastAPI로 고성능 REST API 구축하기",
    summary:
      "FastAPI를 사용해서 고성능 REST API를 구축하는 방법을 다룹니다. 비동기 처리, 데이터 검증, 자동 문서화 등 실무에서 필요한 모든 기능을 포함합니다.",
    author: "박백엔드",
    category: "backend",
    tags: ["Python", "FastAPI", "REST API", "비동기"],
    publishedAt: "2024-01-08",
    thumbnail: "/placeholder.svg?height=200&width=300",
    url: "https://example.com/blog/8",
    views: 1650,
  },
  {
    id: 9,
    title: "주니어 개발자를 위한 코드 리뷰 가이드",
    summary:
      "효과적인 코드 리뷰를 위한 실무 가이드입니다. 리뷰어와 리뷰이 모두에게 도움이 되는 코드 리뷰 문화를 만드는 방법과 구체적인 팁들을 공유합니다.",
    author: "최커리어",
    category: "career",
    tags: ["코드리뷰", "주니어", "개발문화", "협업"],
    publishedAt: "2024-01-07",
    thumbnail: "/placeholder.svg?height=200&width=300",
    url: "https://example.com/blog/9",
    views: 2200,
  },
  {
    id: 10,
    title: "AWS EKS 클러스터 구축과 CI/CD 파이프라인 구성",
    summary:
      "AWS EKS를 사용한 Kubernetes 클러스터 구축부터 GitHub Actions를 활용한 CI/CD 파이프라인 구성까지 전체 과정을 단계별로 설명합니다.",
    author: "이인프라",
    category: "infra",
    tags: ["AWS", "EKS", "CI/CD", "GitHub Actions"],
    publishedAt: "2024-01-06",
    thumbnail: "/placeholder.svg?height=200&width=300",
    url: "https://example.com/blog/10",
    views: 1920,
  },
]

const categories = [
  { id: "all", label: "전체", value: "all" },
  { id: "frontend", label: "프론트엔드", value: "frontend" },
  { id: "backend", label: "백엔드", value: "backend" },
  { id: "infra", label: "인프라", value: "infra" },
  { id: "career", label: "커리어", value: "career" },
]

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [sortBy, setSortBy] = useState<"latest" | "popular">("latest")

  // 필터링 및 정렬 로직
  const filteredAndSortedBlogs = useMemo(() => {
    let filtered = [...mockBlogs]

    // 1. 카테고리 필터링
    if (selectedCategory !== "all") {
      filtered = filtered.filter((blog) => blog.category === selectedCategory)
    }

    // 2. 검색 필터링 (제목, 작성자, 태그에서 검색)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim()
      filtered = filtered.filter((blog) => {
        const titleMatch = blog.title.toLowerCase().includes(query)
        const authorMatch = blog.author.toLowerCase().includes(query)
        const tagsMatch = blog.tags.some((tag) => tag.toLowerCase().includes(query))
        const categoryMatch = blog.category.toLowerCase().includes(query)

        return titleMatch || authorMatch || tagsMatch || categoryMatch
      })
    }

    // 3. 정렬
    filtered.sort((a, b) => {
      if (sortBy === "latest") {
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      } else {
        return b.views - a.views
      }
    })

    return filtered
  }, [searchQuery, selectedCategory, sortBy])

  // 필터 초기화
  const clearFilters = () => {
    setSearchQuery("")
    setSelectedCategory("all")
  }

  // 활성 필터 확인
  const hasActiveFilters = searchQuery.trim() !== "" || selectedCategory !== "all"

  return (
    <div className="min-h-screen bg-background">
      {/* 상단 고정 헤더 */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Tech Blog Hub</h1>
              <div className="text-sm text-muted-foreground">{filteredAndSortedBlogs.length}개의 글</div>
            </div>

            {/* 검색창 */}
            <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="제목, 작성자, 태그로 검색..." />

            {/* 필터 및 정렬 */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryFilter
                  categories={categories}
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                />

                {/* 필터 초기화 버튼 */}
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4 mr-1" />
                    필터 초기화
                  </Button>
                )}
              </div>

              <SortToggle sortBy={sortBy} onSortChange={setSortBy} />
            </div>

            {/* 활성 필터 표시 */}
            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2 text-sm">
                {searchQuery.trim() && (
                  <div className="bg-primary/10 text-primary px-2 py-1 rounded-md">검색: "{searchQuery}"</div>
                )}
                {selectedCategory !== "all" && (
                  <div className="bg-primary/10 text-primary px-2 py-1 rounded-md">
                    카테고리: {categories.find((c) => c.value === selectedCategory)?.label}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <main className="container mx-auto px-4 py-6 pb-20 md:pb-6">
        {filteredAndSortedBlogs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold mb-2">검색 결과가 없습니다</h3>
            <p className="text-muted-foreground mb-4">
              {hasActiveFilters ? "다른 키워드나 카테고리로 검색해보세요." : "블로그 글이 없습니다."}
            </p>
            {hasActiveFilters && (
              <Button onClick={clearFilters} variant="outline">
                모든 글 보기
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedBlogs.map((blog) => (
              <BlogCard key={blog.id} blog={blog} searchQuery={searchQuery} />
            ))}
          </div>
        )}
      </main>

      {/* 모바일 하단 네비게이션 */}
      <NavigationBar />
    </div>
  )
}
