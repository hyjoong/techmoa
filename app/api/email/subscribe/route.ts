import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { email, name, tags } = await request.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "올바른 이메일을 입력해주세요." },
        { status: 400 }
      );
    }

    const existing = await prisma.subscriber.findUnique({
      where: { email },
    });

    if (existing) {
      if (existing.is_active) {
        return NextResponse.json(
          { error: "이미 구독 중인 이메일입니다." },
          { status: 409 }
        );
      }

      // 비활성 구독자 재활성화
      const unsubscribeToken = crypto.randomBytes(32).toString("hex");
      await prisma.subscriber.update({
        where: { email },
        data: {
          is_active: true,
          name,
          subscribed_tags: tags || [],
          unsubscribe_token: unsubscribeToken,
          updated_at: new Date(),
        },
      });

      await sendWelcomeEmail(email, name, unsubscribeToken);
      return NextResponse.json({ success: true, message: "구독이 재활성화되었습니다." });
    }

    const unsubscribeToken = crypto.randomBytes(32).toString("hex");

    await prisma.subscriber.create({
      data: {
        email,
        name,
        subscribed_tags: tags || [],
        unsubscribe_token: unsubscribeToken,
      },
    });

    await sendWelcomeEmail(email, name, unsubscribeToken);

    return NextResponse.json({ success: true, message: "구독이 완료되었습니다." });
  } catch (error) {
    console.error("구독 처리 실패:", error);
    return NextResponse.json(
      { error: "구독 처리에 실패했습니다." },
      { status: 500 }
    );
  }
}
