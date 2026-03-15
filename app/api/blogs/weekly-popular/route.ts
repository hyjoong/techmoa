import { NextResponse } from "next/server";
import { fetchWeeklyPopularBlogs } from "@/lib/db";

export async function GET() {
  try {
    const blogs = await fetchWeeklyPopularBlogs();
    return NextResponse.json(blogs);
  } catch (error) {
    console.error("주간 인기글 조회 실패:", error);
    return NextResponse.json({ error: "주간 인기글 조회 실패" }, { status: 500 });
  }
}
