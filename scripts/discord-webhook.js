import dotenv from "dotenv";
dotenv.config();

const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

/**
 * Discord 웹훅으로 새 기술블로그 글 알림 전송
 * @param {Array} newArticles - 새로 크롤링된 글 목록
 */
export async function sendDiscordNotification(newArticles) {
  if (!DISCORD_WEBHOOK_URL) {
    console.log("⚠️  DISCORD_WEBHOOK_URL이 설정되지 않았습니다. Discord 알림을 건너뜁니다.");
    return;
  }

  if (!newArticles || newArticles.length === 0) return;

  try {
    // 블로그별로 그룹화
    const grouped = {};
    for (const article of newArticles) {
      const author = article.author || "기타";
      if (!grouped[author]) grouped[author] = [];
      grouped[author].push(article);
    }

    // Embed 필드 생성 (블로그별 새 글 목록)
    const fields = Object.entries(grouped).map(([author, articles]) => ({
      name: `📝 ${author} (${articles.length}개)`,
      value: articles
        .slice(0, 5) // 블로그당 최대 5개
        .map((a) => `[${truncate(a.title, 50)}](${a.external_url})`)
        .join("\n"),
      inline: false,
    }));

    // Discord embed 메시지 (최대 25개 필드 제한)
    const embeds = [];
    for (let i = 0; i < fields.length; i += 25) {
      embeds.push({
        title: i === 0 ? `🚀 새 기술블로그 글 ${newArticles.length}개 업데이트!` : null,
        color: 0x5865f2, // Discord 블루
        fields: fields.slice(i, i + 25),
        ...(i === 0 && {
          footer: { text: "techgom RSS Crawler" },
          timestamp: new Date().toISOString(),
        }),
      });
    }

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds }),
    });

    if (response.ok) {
      console.log(`✅ Discord 알림 전송 완료 (${newArticles.length}개 글)`);
    } else {
      const text = await response.text();
      console.error(`❌ Discord 알림 전송 실패: ${response.status} ${text}`);
    }
  } catch (error) {
    console.error("❌ Discord 알림 전송 중 오류:", error.message);
  }
}

function truncate(str, maxLength) {
  if (!str) return "제목 없음";
  return str.length > maxLength ? str.slice(0, maxLength) + "..." : str;
}
