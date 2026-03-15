import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Railway 크론잡에서 호출하는 엔드포인트
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 크롤링은 별도 프로세스로 실행
    // Railway에서는 이 엔드포인트를 크론으로 호출하거나
    // 별도 worker 서비스에서 실행
    const { execSync } = await import("child_process");
    execSync("node scripts/rss-crawler.js", {
      cwd: process.cwd(),
      timeout: 600000, // 10분 타임아웃
      stdio: "inherit",
    });

    return NextResponse.json({ success: true, message: "크롤링 완료" });
  } catch (error: any) {
    console.error("크롤링 실패:", error);
    return NextResponse.json(
      { error: "크롤링 실패", message: error.message },
      { status: 500 }
    );
  }
}
