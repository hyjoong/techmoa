import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_FROM = process.env.EMAIL_FROM || "TechMoa <noreply@techmoa.dev>";

interface NewArticleEmailData {
  articles: {
    title: string;
    author: string;
    external_url: string;
    summary?: string;
    blog_type: string;
  }[];
  subscriberEmail: string;
  subscriberName?: string;
  unsubscribeToken: string;
}

// 새 글 알림 이메일 발송
export async function sendNewArticlesEmail(data: NewArticleEmailData) {
  const { articles, subscriberEmail, subscriberName, unsubscribeToken } = data;
  const baseUrl = process.env.NEXTAUTH_URL || "https://techmoa.dev";

  const articleListHtml = articles
    .map(
      (article) => `
      <tr>
        <td style="padding: 16px 0; border-bottom: 1px solid #eee;">
          <a href="${article.external_url}" style="color: #1a1a1a; text-decoration: none; font-size: 16px; font-weight: 600;">
            ${article.title}
          </a>
          <div style="margin-top: 4px; color: #666; font-size: 13px;">
            ${article.author} · ${article.blog_type === "company" ? "기업" : "개인"}
          </div>
          ${article.summary ? `<div style="margin-top: 8px; color: #444; font-size: 14px; line-height: 1.5;">${article.summary.substring(0, 150)}...</div>` : ""}
        </td>
      </tr>
    `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 32px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1a1a1a; font-size: 24px; margin: 0;">TechMoa</h1>
          <p style="color: #666; font-size: 14px; margin-top: 8px;">오늘의 새로운 기술 블로그 글</p>
        </div>

        <p style="color: #333; font-size: 15px; line-height: 1.6;">
          안녕하세요${subscriberName ? ` ${subscriberName}` : ""}님,<br>
          새로운 기술 블로그 글 <strong>${articles.length}개</strong>가 올라왔습니다.
        </p>

        <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
          ${articleListHtml}
        </table>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${baseUrl}" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 14px;">
            TechMoa에서 더 보기
          </a>
        </div>

        <div style="border-top: 1px solid #eee; padding-top: 16px; margin-top: 32px; text-align: center; color: #999; font-size: 12px;">
          <p>이 메일은 TechMoa 구독 알림입니다.</p>
          <a href="${baseUrl}/api/email/unsubscribe?token=${unsubscribeToken}" style="color: #999;">구독 해제</a>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const { data: result, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: subscriberEmail,
      subject: `[TechMoa] 새 글 ${articles.length}개가 올라왔습니다`,
      html,
    });

    if (error) {
      console.error("이메일 발송 실패:", error);
      return { success: false, error };
    }

    return { success: true, id: result?.id };
  } catch (error) {
    console.error("이메일 발송 중 오류:", error);
    return { success: false, error };
  }
}

// 환영 이메일 발송
export async function sendWelcomeEmail(email: string, name?: string, unsubscribeToken?: string) {
  const baseUrl = process.env.NEXTAUTH_URL || "https://techmoa.dev";

  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 32px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #1a1a1a; font-size: 24px; margin: 0;">TechMoa</h1>
        </div>

        <h2 style="color: #1a1a1a; font-size: 20px;">구독을 환영합니다!</h2>
        <p style="color: #333; font-size: 15px; line-height: 1.6;">
          안녕하세요${name ? ` ${name}` : ""}님,<br><br>
          TechMoa 이메일 알림 구독이 완료되었습니다.
          국내 주요 기업과 개발자들의 새로운 기술 블로그 글이 올라오면 이메일로 알려드리겠습니다.
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${baseUrl}" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-size: 14px;">
            TechMoa 방문하기
          </a>
        </div>

        <div style="border-top: 1px solid #eee; padding-top: 16px; margin-top: 32px; text-align: center; color: #999; font-size: 12px;">
          ${unsubscribeToken ? `<a href="${baseUrl}/api/email/unsubscribe?token=${unsubscribeToken}" style="color: #999;">구독 해제</a>` : ""}
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const { error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: email,
      subject: "[TechMoa] 이메일 알림 구독이 완료되었습니다",
      html,
    });

    return { success: !error, error };
  } catch (error) {
    return { success: false, error };
  }
}
