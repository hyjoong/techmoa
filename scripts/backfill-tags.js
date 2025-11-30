import dotenv from "dotenv";
dotenv.config();

import { createClient } from "@supabase/supabase-js";
import { generateTagsForArticle } from "./ai-tags.js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REQUEST_DELAY_MS = parseInt(
  process.env.TAG_REQUEST_DELAY_MS || "8000",
  10
);

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Supabase 환경변수가 없습니다.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const PAGE_SIZE = 50;

async function fetchPage(page) {
  const from = page * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  const { data, error } = await supabase
    .from("blogs")
    .select("id,title,summary,author,tags")
    .order("id", { ascending: true })
    .range(from, to);

  if (error) throw error;
  return data || [];
}

async function backfill() {
  let page = 0;
  let total = 0;
  let updated = 0;
  let skipped = 0;

  while (true) {
    const rows = await fetchPage(page);
    if (rows.length === 0) break;
    total += rows.length;

    for (const row of rows) {
      const needsTags =
        !row.tags || (Array.isArray(row.tags) && row.tags.length === 0);

      if (!needsTags) {
        skipped++;
        continue;
      }

      const tags = await generateTagsForArticle({
        title: row.title,
        summary: row.summary,
        author: row.author,
      });

      if (!tags || tags.length === 0) {
        console.log(`⚠️ 태그 생성 실패: ${row.id} ${row.title}`);
        if (REQUEST_DELAY_MS > 0) {
          await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
        }
        continue;
      }

      const { error } = await supabase
        .from("blogs")
        .update({ tags, updated_at: new Date().toISOString() })
        .eq("id", row.id);

      if (error) {
        console.error(`❌ 업데이트 실패 id=${row.id}:`, error.message);
      } else {
        updated++;
        console.log(`✅ 태그 업데이트: ${row.id} → ${tags.join(", ")}`);
      }

      // API rate limit을 피하려고 요청 사이에 지연을 둠
      if (REQUEST_DELAY_MS > 0) {
        await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS));
      }
    }

    if (rows.length < PAGE_SIZE) break;
    page++;
  }

  console.log(
    `완료: 총 ${total}개 중 ${updated}개 업데이트, ${skipped}개 스킵`
  );
}

backfill().catch((err) => {
  console.error("❌ 백필 중 오류:", err.message);
  process.exit(1);
});
