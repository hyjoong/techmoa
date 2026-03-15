import { prisma } from "./prisma";
import { Prisma } from "@prisma/client";

// 블로그 데이터 타입 정의 (기존 호환)
export interface Blog {
  id: number;
  title: string;
  summary: string | null;
  author: string;
  tags?: string[];
  published_at: string;
  thumbnail_url: string | null;
  external_url: string;
  views: number;
  blog_type: "company" | "personal";
  category: "FE" | "BE" | "AI" | "APP" | null;
  created_at: string;
  updated_at: string;
}

// Prisma Blog → Blog interface 변환
function toBlog(data: any): Blog {
  return {
    ...data,
    published_at: data.published_at?.toISOString() ?? new Date().toISOString(),
    created_at: data.created_at?.toISOString() ?? new Date().toISOString(),
    updated_at: data.updated_at?.toISOString() ?? new Date().toISOString(),
  };
}

// 사용 가능한 블로그 목록 조회 (기업/개인별)
export async function fetchAvailableBlogs() {
  try {
    const companyData = await prisma.blog.findMany({
      where: { blog_type: "company" },
      select: { author: true, category: true },
      distinct: ["author"],
    });

    const personalData = await prisma.blog.findMany({
      where: { blog_type: "personal" },
      select: { author: true, category: true },
      distinct: ["author"],
    });

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
      "여기어때",
      "쏘카",
      "29CM",
      "하이퍼커넥트",
      "데브시스터즈",
      "뱅크샐러드",
      "콴다",
      "왓챠",
      "쿠팡",
      "AB180",
      "에잇퍼센트",
      "요기요",
      "원티드",
      "사람인",
      "데이블",
      "직방",
      "다나와",
    ];

    const companies = companyData
      .map((item) => ({
        author: item.author,
        blog_type: "company" as const,
        category: item.category,
      }))
      .sort((a, b) => {
        const aIndex = companySortOrder.indexOf(a.author);
        const bIndex = companySortOrder.indexOf(b.author);
        if (aIndex === -1 && bIndex === -1)
          return a.author.localeCompare(b.author);
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });

    const individuals = personalData
      .map((item) => ({
        author: item.author,
        blog_type: "personal" as const,
        category: item.category,
      }))
      .sort((a, b) => a.author.localeCompare(b.author));

    return { companies, individuals };
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
  tags,
  tagMode = "or",
}: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "published_at" | "title" | "views";
  blogType?: "company" | "personal";
  author?: string;
  tags?: string[];
  tagMode?: "and" | "or";
} = {}) {
  const where: Prisma.BlogWhereInput = {
    blog_type: blogType,
  };

  if (author && author.trim()) {
    where.author = author.trim();
  }

  if (search && search.trim()) {
    const searchTerm = search.trim();
    where.OR = [
      { title: { contains: searchTerm, mode: "insensitive" } },
      { author: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  if (tags && tags.length > 0) {
    if (tagMode === "and") {
      where.tags = { hasEvery: tags };
    } else {
      where.tags = { hasSome: tags };
    }
  }

  const orderBy: Prisma.BlogOrderByWithRelationInput = {};
  const ascending = sortBy === "title";
  orderBy[sortBy] = ascending ? "asc" : "desc";

  const skip = (page - 1) * limit;

  const [data, count] = await Promise.all([
    prisma.blog.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.blog.count({ where }),
  ]);

  return {
    blogs: data.map(toBlog),
    totalCount: count,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
  };
}

// 블로그 생성
export async function createBlog(
  blogData: Omit<Blog, "id" | "created_at" | "updated_at">
) {
  const data = await prisma.blog.create({
    data: {
      title: blogData.title,
      summary: blogData.summary,
      author: blogData.author,
      tags: blogData.tags || [],
      published_at: new Date(blogData.published_at),
      thumbnail_url: blogData.thumbnail_url,
      external_url: blogData.external_url,
      views: blogData.views || 0,
      blog_type: blogData.blog_type,
      category: blogData.category,
    },
  });
  return toBlog(data);
}

// 블로그 수정
export async function updateBlog(
  id: number,
  blogData: Partial<Omit<Blog, "id" | "created_at" | "updated_at">>
) {
  const updateData: any = { ...blogData, updated_at: new Date() };
  if (blogData.published_at) {
    updateData.published_at = new Date(blogData.published_at);
  }
  const data = await prisma.blog.update({
    where: { id },
    data: updateData,
  });
  return toBlog(data);
}

// 블로그 삭제
export async function deleteBlog(id: number) {
  await prisma.blog.delete({ where: { id } });
}

// 조회수 증가
export async function incrementViews(id: number) {
  try {
    await prisma.blog.update({
      where: { id },
      data: { views: { increment: 1 } },
    });
  } catch (error) {
    console.error("조회수 증가 실패:", error);
  }
}

// 주간 인기글 조회
export async function fetchWeeklyPopularBlogs(limit = 5) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const data = await prisma.blog.findMany({
    where: {
      published_at: { gte: oneWeekAgo },
    },
    orderBy: { views: "desc" },
    take: limit,
  });

  return data.map(toBlog);
}
