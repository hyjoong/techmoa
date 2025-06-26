import { MetadataRoute } from "next";
import { fetchBlogs } from "@/lib/supabase";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://techgom.vercel.app";

  // 기본 정적 페이지들
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  // 블로그 글들을 동적으로 sitemap에 추가
  try {
    const blogsData = await fetchBlogs({
      page: 1,
      limit: 1000, // 최대 1000개까지 sitemap에 포함
      sortBy: "published_at",
    });

    const blogPages: MetadataRoute.Sitemap = blogsData.blogs.map((blog) => ({
      url: blog.external_url, // 외부 링크이므로 원본 URL 사용
      lastModified: new Date(blog.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    return [...staticPages, ...blogPages];
  } catch (error) {
    console.error("Sitemap 생성 중 오류:", error);
    // 오류 발생 시 정적 페이지만 반환
    return staticPages;
  }
}
