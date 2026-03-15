import { NextRequest, NextResponse } from "next/server";
import { fetchBlogs, fetchAvailableBlogs } from "@/lib/db";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");

  try {
    if (action === "available") {
      const result = await fetchAvailableBlogs();
      return NextResponse.json(result);
    }

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const search = searchParams.get("search") || undefined;
    const sortBy = (searchParams.get("sortBy") || "published_at") as "published_at" | "title" | "views";
    const blogType = (searchParams.get("blogType") || "company") as "company" | "personal";
    const author = searchParams.get("author") || undefined;
    const tagsParam = searchParams.get("tags");
    const tags = tagsParam ? tagsParam.split(",") : undefined;
    const tagMode = (searchParams.get("tagMode") || "or") as "and" | "or";

    const result = await fetchBlogs({
      page, limit, search, sortBy, blogType, author, tags, tagMode,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("블로그 조회 실패:", error);
    return NextResponse.json({ error: "블로그 조회 실패" }, { status: 500 });
  }
}
