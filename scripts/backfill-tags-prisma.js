import dotenv from "dotenv";
dotenv.config();
import { PrismaClient } from "@prisma/client";
import { generateTagsForArticle } from "./ai-tags.js";

const prisma = new PrismaClient();
const REQUEST_DELAY_MS = parseInt(process.env.TAG_REQUEST_DELAY_MS || "8000", 10);
const PAGE_SIZE = 50;

async function backfill() {
  let skip = 0;
  let total = 0;
  let updated = 0;
  let skipped = 0;

  while (true) {
    const rows = await prisma.blog.findMany({
      select: { id: true, title: true, summary: true, author: true, tags: true },
      orderBy: { id: "asc" },
      skip,
      take: PAGE_SIZE,
    });

    if (rows.length === 0) break;
    total += rows.length;

    for (const row of rows) {
      const needsTags = !row.tags || (Array.isArray(row.tags) && row.tags.length === 0);
      if (!needsTags) { skipped++; continue; }

      const tags = await generateTagsForArticle({
        title: row.title,
        summary: row.summary,
        author: row.author,
      });

      if (!tags || tags.length === 0) {
        console.log(`⚠️ 태그 생성 실패: ${row.id} ${row.title}`);
        if (REQUEST_DELAY_MS > 0) await new Promise(r => setTimeout(r, REQUEST_DELAY_MS));
        continue;
      }

      await prisma.blog.update({
        where: { id: row.id },
        data: { tags, updated_at: new Date() },
      });

      updated++;
      console.log(`✅ 태그 업데이트: ${row.id} → ${tags.join(", ")}`);
      if (REQUEST_DELAY_MS > 0) await new Promise(r => setTimeout(r, REQUEST_DELAY_MS));
    }

    if (rows.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  console.log(`완료: 총 ${total}개 중 ${updated}개 업데이트, ${skipped}개 스킵`);
  await prisma.$disconnect();
}

backfill().catch((err) => {
  console.error("❌ 백필 중 오류:", err.message);
  process.exit(1);
});
