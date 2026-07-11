import dotenv from "dotenv";
dotenv.config();
import { runRssCrawl } from "../lib/server/rss-crawler-service.js";

async function main() {
  try {
    await runRssCrawl();
  } catch (error) {
    console.error("❌ 크롤링 중 치명적 오류:", error.message);
    process.exit(1);
  }
}

// 스크립트로 직접 실행될 때만 크롤링 시작 (import 시 자동 실행 방지)
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
