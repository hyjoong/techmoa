import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendNewArticlesEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  // 크론잡 인증
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 최근 24시간 내 새 글 조회
    const since = new Date();
    since.setHours(since.getHours() - 24);

    const newArticles = await prisma.blog.findMany({
      where: { created_at: { gte: since } },
      orderBy: { published_at: "desc" },
      take: 50,
    });

    if (newArticles.length === 0) {
      return NextResponse.json({ message: "새 글이 없습니다.", sent: 0 });
    }

    // 활성 구독자 조회
    const subscribers = await prisma.subscriber.findMany({
      where: { is_active: true },
    });

    let sent = 0;
    let failed = 0;

    for (const subscriber of subscribers) {
      // 구독 태그 필터링 (태그가 없으면 모든 글 발송)
      let filteredArticles = newArticles;
      if (subscriber.subscribed_tags.length > 0) {
        filteredArticles = newArticles.filter((article) =>
          article.tags.some((tag) => subscriber.subscribed_tags.includes(tag))
        );
      }

      if (filteredArticles.length === 0) continue;

      const result = await sendNewArticlesEmail({
        articles: filteredArticles.map((a) => ({
          title: a.title,
          author: a.author,
          external_url: a.external_url,
          summary: a.summary || undefined,
          blog_type: a.blog_type || "company",
        })),
        subscriberEmail: subscriber.email,
        subscriberName: subscriber.name || undefined,
        unsubscribeToken: subscriber.unsubscribe_token || "",
      });

      if (result.success) sent++;
      else failed++;

      // Rate limiting
      await new Promise((r) => setTimeout(r, 100));
    }

    return NextResponse.json({
      message: `이메일 발송 완료`,
      articles: newArticles.length,
      subscribers: subscribers.length,
      sent,
      failed,
    });
  } catch (error) {
    console.error("이메일 알림 실패:", error);
    return NextResponse.json({ error: "이메일 알림 실패" }, { status: 500 });
  }
}
