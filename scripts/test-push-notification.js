import {
  sendInstantNotification,
  sendDailySummaryNotification,
} from "./push-notification.js";

console.log("🧪 푸시 알림 테스트 시작...\n");

// 테스트 글 데이터
const testArticle = {
  id: 999999,
  title: "테스트 알림 - 푸시 기능이 정상 작동하는지 확인합니다",
  author: "토스",
  external_url: "https://toss.tech",
  blog_type: "company",
};

const testArticles = [
  {
    id: 999998,
    title: "React 19 새로운 기능 살펴보기",
    author: "카카오",
    external_url: "https://tech.kakao.com",
  },
  {
    id: 999997,
    title: "Kubernetes 운영 노하우",
    author: "무신사",
    external_url: "https://medium.com/musinsa-tech",
  },
  {
    id: 999996,
    title: "TypeScript 5.0 마이그레이션 가이드",
    author: "당근",
    external_url: "https://medium.com/daangn",
  },
];

async function runTests() {
  try {
    console.log("1️⃣ 개별 즉시 알림 테스트...");
    const result1 = await sendInstantNotification(testArticle);
    console.log("결과:", result1);
    console.log("");

    // 2초 대기
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log("2️⃣ 일일 요약 알림 테스트...");
    const result2 = await sendDailySummaryNotification(testArticles);
    console.log("결과:", result2);
    console.log("");

    console.log("✅ 테스트 완료!");
    console.log("\n📱 Flutter 앱에서 알림이 수신되는지 확인하세요.");
    console.log("토픽 구독 확인: all_blogs, blog_toss");
  } catch (error) {
    console.error("❌ 테스트 실패:", error);
    process.exit(1);
  }
}

runTests();
