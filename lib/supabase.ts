import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 블로그 데이터 타입 정의
export interface Blog {
  id: number
  title: string
  summary: string | null
  author: string
  category: string
  tags: string[]
  published_at: string
  thumbnail_url: string | null
  external_url: string
  views: number
  created_at: string
  updated_at: string
}

// 블로그 목록 조회 (서버 필터링 + 페이징)
export async function fetchBlogs({
  page = 1,
  limit = 12,
  category,
  search,
  sortBy = "published_at",
}: {
  page?: number
  limit?: number
  category?: string
  search?: string
  sortBy?: "published_at" | "title" | "created_at" | "views"
} = {}) {
  let query = supabase.from("blogs").select("*", { count: "exact" })

  // 카테고리 필터
  if (category && category !== "all") {
    query = query.eq("category", category)
  }

  // 검색 필터 (제목, 작성자, 태그에서 검색)
  if (search && search.trim()) {
    const searchTerm = search.trim()
    query = query.or(`title.ilike.%${searchTerm}%,author.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`)
  }

  // 정렬
  const ascending = sortBy === "title"
  query = query.order(sortBy, { ascending })

  // 페이징
  const from = (page - 1) * limit
  const to = from + limit - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    throw new Error(`블로그 데이터 조회 실패: ${error.message}`)
  }

  return {
    blogs: data as Blog[],
    totalCount: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
    currentPage: page,
  }
}

// 블로그 생성
export async function createBlog(blogData: Omit<Blog, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase.from("blogs").insert([blogData]).select().single()

  if (error) {
    throw new Error(`블로그 생성 실패: ${error.message}`)
  }

  return data as Blog
}

// 블로그 수정
export async function updateBlog(id: number, blogData: Partial<Omit<Blog, "id" | "created_at" | "updated_at">>) {
  const { data, error } = await supabase
    .from("blogs")
    .update({ ...blogData, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) {
    throw new Error(`블로그 수정 실패: ${error.message}`)
  }

  return data as Blog
}

// 블로그 삭제
export async function deleteBlog(id: number) {
  const { error } = await supabase.from("blogs").delete().eq("id", id)

  if (error) {
    throw new Error(`블로그 삭제 실패: ${error.message}`)
  }
}

// 조회수 증가
export async function incrementViews(id: number) {
  const { error } = await supabase.rpc("increment_views", { blog_id: id })

  if (error) {
    console.error("조회수 증가 실패:", error.message)
  }
}
