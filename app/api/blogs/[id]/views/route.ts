import { NextRequest, NextResponse } from "next/server";
import { incrementViews } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await incrementViews(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("조회수 증가 실패:", error);
    return NextResponse.json({ error: "조회수 증가 실패" }, { status: 500 });
  }
}
