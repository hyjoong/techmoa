import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 블로그 데이터 타입 정의
export interface Blog {
  id: number;
  title: string;
  summary: string | null;
  author: string;
  tags: string[];
  published_at: string;
  thumbnail_url: string | null;
  external_url: string;
  views: number;
  blog_type: "company" | "personal";
  created_at: string;
  updated_at: string;
}

// 사용 가능한 블로그 목록 조회 (기업/개인별)
export async function fetchAvailableBlogs() {
  try {
    const { data, error } = await supabase
      .from("blogs")
      .select("author, blog_type")
      .order("author");

    if (error) {
      throw new Error(`블로그 목록 조회 실패: ${error.message}`);
    }

    // 중복 제거 및 그룹화
    const blogMap = new Map<
      string,
      { author: string; blog_type: "company" | "personal" }
    >();

    data?.forEach((item) => {
      if (!blogMap.has(item.author)) {
        blogMap.set(item.author, {
          author: item.author,
          blog_type: item.blog_type,
        });
      }
    });

    const blogs = Array.from(blogMap.values());

    // 기업 블로그를 사용자 접근성을 고려한 정렬 순서로 정렬
    const companySortOrder = [
      "토스",
      "당근",
      "카카오",
      "카카오페이",
      "무신사",
      "29CM",
      "올리브영",
      "우아한형제들",
      "마켓컬리",
      "에잇퍼센트",
      "쏘카",
      "이스트소프트",
      "하이퍼커넥트",
      "데브시스터즈",
      "뱅크샐러드",
      "왓챠",
      "다나와",
      "요기요",
      "쿠팡",
      "원티드",
      "데이블",
      "직방",
    ];

    const companies = blogs.filter((blog) => blog.blog_type === "company");
    const sortedCompanies = companies.sort((a, b) => {
      const aIndex = companySortOrder.indexOf(a.author);
      const bIndex = companySortOrder.indexOf(b.author);

      // 정렬 순서에 있는 기업은 위로, 없는 기업은 알파벳 순
      if (aIndex === -1 && bIndex === -1) {
        return a.author.localeCompare(b.author);
      }
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    return {
      companies: sortedCompanies,
      individuals: blogs
        .filter((blog) => blog.blog_type === "personal")
        .sort((a, b) => a.author.localeCompare(b.author)),
    };
  } catch (error) {
    console.error("블로그 목록 조회 실패:", error);
    return { companies: [], individuals: [] };
  }
}

// 블로그 목록 조회 (서버 필터링 + 페이징)
export async function fetchBlogs({
  page = 1,
  limit = 12,
  search,
  sortBy = "published_at",
  blogType = "company",
  author,
}: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "published_at" | "title" | "views";
  blogType?: "company" | "personal";
  author?: string;
} = {}) {
  let query = supabase.from("blogs").select("*", { count: "exact" });

  // 블로그 타입 필터
  query = query.eq("blog_type", blogType);

  // 특정 작성자 필터
  if (author && author.trim()) {
    query = query.eq("author", author.trim());
  }

  // 검색 필터 (제목, 작성자, 태그에서 검색)
  if (search && search.trim()) {
    const searchTerm = search.trim();
    query = query.or(
      `title.ilike.%${searchTerm}%,author.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`
    );
  }

  // 정렬
  const ascending = sortBy === "title";
  query = query.order(sortBy, { ascending });

  // 페이징
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`블로그 데이터 조회 실패: ${error.message}`);
  }

  return {
    blogs: data as Blog[],
    totalCount: count || 0,
    totalPages: Math.ceil((count || 0) / limit),
    currentPage: page,
  };
}

// 블로그 생성
export async function createBlog(
  blogData: Omit<Blog, "id" | "created_at" | "updated_at">
) {
  const { data, error } = await supabase
    .from("blogs")
    .insert([blogData])
    .select()
    .single();

  if (error) {
    throw new Error(`블로그 생성 실패: ${error.message}`);
  }

  return data as Blog;
}

// 블로그 수정
export async function updateBlog(
  id: number,
  blogData: Partial<Omit<Blog, "id" | "created_at" | "updated_at">>
) {
  const { data, error } = await supabase
    .from("blogs")
    .update({ ...blogData, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`블로그 수정 실패: ${error.message}`);
  }

  return data as Blog;
}

// 블로그 삭제
export async function deleteBlog(id: number) {
  const { error } = await supabase.from("blogs").delete().eq("id", id);

  if (error) {
    throw new Error(`블로그 삭제 실패: ${error.message}`);
  }
}

// 조회수 증가
export async function incrementViews(id: number) {
  const { error } = await supabase.rpc("increment_views", { blog_id: id });

  if (error) {
    console.error("조회수 증가 실패:", error.message);
  }
}
