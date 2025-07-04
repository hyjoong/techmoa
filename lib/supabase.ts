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
  published_at: string;
  thumbnail_url: string | null;
  external_url: string;
  views: number;
  blog_type: "company" | "personal";
  category: "FE" | "BE" | "AI" | "APP" | null;
  created_at: string;
  updated_at: string;
}

// 저자 타입 정의
interface AuthorInfo {
  author: string;
  blog_type: "company" | "personal";
  category?: "FE" | "BE" | "AI" | "APP" | null;
}

// 사용 가능한 블로그 목록 조회 (기업/개인별)
export async function fetchAvailableBlogs() {
  try {
    // 카테고리 정보를 포함하여 조회
    const { data: companyData, error: companyError } = await supabase
      .from("blogs")
      .select("author, category")
      .eq("blog_type", "company");

    const { data: personalData, error: personalError } = await supabase
      .from("blogs")
      .select("author, category")
      .eq("blog_type", "personal");

    if (companyError) {
      throw new Error(`기업 블로그 목록 조회 실패: ${companyError.message}`);
    }

    if (personalError) {
      throw new Error(`개인 블로그 목록 조회 실패: ${personalError.message}`);
    }

    // 중복 제거하면서 카테고리 정보 유지
    const companies = Array.from(
      new Map((companyData || []).map((item) => [item.author, item]))
    ).map(([author, item]) => ({
      author,
      blog_type: "company" as const,
      category: item.category,
    }));

    const individuals = Array.from(
      new Map((personalData || []).map((item) => [item.author, item]))
    ).map(([author, item]) => ({
      author,
      blog_type: "personal" as const,
      category: item.category,
    }));

    // 기업 블로그를 사용자 접근성을 고려한 정렬 순서로 정렬
    const companySortOrder = [
      "토스",
      "당근",
      "네이버",
      "카카오",
      "카카오페이",
      "라인",
      "우아한형제들",
      "무신사",
      "올리브영",
      "마켓컬리",
      "레브잇",
      "쏘카",
      "29CM",
      "하이퍼커넥트",
      "데브시스터즈",
      "뱅크샐러드",
      "콴다",
      "왓챠",
      "쿠팡",
      "에잇퍼센트",
      "요기요",
      "원티드",
      "데이블",
      "직방",
      "다나와",
    ];

    // 기업 블로그 정렬
    const sortedCompanies = companies.sort((a: AuthorInfo, b: AuthorInfo) => {
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

    // 개인 블로그 정렬 (알파벳 순)
    const sortedPersonals = individuals.sort((a: AuthorInfo, b: AuthorInfo) =>
      a.author.localeCompare(b.author)
    );

    return {
      companies: sortedCompanies,
      individuals: sortedPersonals,
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

  // 검색 필터 (제목, 작성자에서 검색)
  if (search && search.trim()) {
    const searchTerm = search.trim();
    query = query.or(
      `title.ilike.%${searchTerm}%,author.ilike.%${searchTerm}%`
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
