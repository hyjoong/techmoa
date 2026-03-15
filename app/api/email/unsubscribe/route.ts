import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "토큰이 필요합니다." }, { status: 400 });
  }

  try {
    const subscriber = await prisma.subscriber.findFirst({
      where: { unsubscribe_token: token },
    });

    if (!subscriber) {
      return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 404 });
    }

    await prisma.subscriber.update({
      where: { id: subscriber.id },
      data: { is_active: false, updated_at: new Date() },
    });

    // 간단한 구독 해제 확인 HTML 반환
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>구독 해제</title></head>
      <body style="font-family: sans-serif; text-align: center; padding: 60px;">
        <h2>구독이 해제되었습니다</h2>
        <p>TechMoa 이메일 알림 구독이 해제되었습니다.</p>
        <p><a href="/">TechMoa로 돌아가기</a></p>
      </body>
      </html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  } catch (error) {
    console.error("구독 해제 실패:", error);
    return NextResponse.json({ error: "구독 해제 실패" }, { status: 500 });
  }
}
