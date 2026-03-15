import { NextRequest, NextResponse } from "next/server";

// NextAuth가 /api/auth/callback/*을 처리하므로
// 이 라우트는 레거시 호환용 리다이렉트만 수행합니다.
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  return NextResponse.redirect(requestUrl.origin);
}
