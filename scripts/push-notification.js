import admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

// Firebase Admin SDK 초기화
// Firebase Console에서 서비스 계정 키를 다운로드하여 사용
// https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk
let firebaseInitialized = false;

function initializeFirebase() {
  if (firebaseInitialized) return;

  try {
    // 환경 변수에서 Firebase 서비스 계정 키 읽기
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : null;

    if (!serviceAccount) {
      console.log("⚠️  Firebase 서비스 계정 키가 없습니다. 알림을 건너뜁니다.");
      return;
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    firebaseInitialized = true;
    console.log("✅ Firebase Admin SDK 초기화 완료");
  } catch (error) {
    console.error("❌ Firebase 초기화 실패:", error.message);
  }
}

// 즉시 알림을 보낼 인기 블로그 목록
const INSTANT_NOTIFICATION_BLOGS = [
  "토스",
  "카카오",
  "우아한형제들",
  "네이버",
  "당근",
  "쿠팡",
  "라인",
  "무신사",
  "올리브영",
  "마켓컬리",
];

/**
 * 개별 블로그 글에 대한 즉시 푸시 알림 전송
 * @param {Object} article - 블로그 글 정보
 * @param {string} article.id - 글 ID
 * @param {string} article.title - 글 제목
 * @param {string} article.author - 작성자 (블로그명)
 * @param {string} article.external_url - 원문 URL
 * @param {string} article.blog_type - 블로그 타입 (company/personal)
 */
export async function sendInstantNotification(article) {
  if (!firebaseInitialized) {
    initializeFirebase();
  }

  if (!firebaseInitialized) {
    return { success: false, error: "Firebase not initialized" };
  }

  try {
    // 토픽 생성: blog_author 형식 (예: blog_toss, blog_kakao)
    const authorSlug = article.author
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
    const topic = `blog_${authorSlug}`;

    // 알림 메시지 구성
    const message = {
      notification: {
        title: `${article.author} - 새 글`,
        body: article.title.substring(0, 100),
      },
      data: {
        blog_id: article.id ? article.id.toString() : "",
        url: article.external_url || "",
        author: article.author || "",
        type: "instant",
      },
      topic: topic,
      // iOS 알림 설정
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
      // Android 알림 설정
      android: {
        priority: "high",
        notification: {
          sound: "default",
          priority: "high",
          channelId: "new_blog_posts",
        },
      },
    };

    await admin.messaging().send(message);
    console.log(`✅ [즉시 알림] ${article.author}: ${article.title}`);

    // 전체 구독자에게도 전송
    await admin.messaging().send({
      ...message,
      topic: "all_blogs",
    });

    return { success: true, topic };
  } catch (error) {
    console.error(`❌ [즉시 알림 실패] ${article.author}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 일일 요약 알림 전송 (배치 처리)
 * @param {Array} articles - 새로 추가된 글 목록
 */
export async function sendDailySummaryNotification(articles) {
  if (!firebaseInitialized) {
    initializeFirebase();
  }

  if (!firebaseInitialized || articles.length === 0) {
    return { success: false, error: "No articles or Firebase not initialized" };
  }

  try {
    // 블로그별 그룹핑
    const blogGroups = articles.reduce((acc, article) => {
      const author = article.author;
      if (!acc[author]) {
        acc[author] = [];
      }
      acc[author].push(article);
      return acc;
    }, {});

    const blogCount = Object.keys(blogGroups).length;
    const totalCount = articles.length;

    // 상위 3개 블로그 이름
    const topBlogs = Object.keys(blogGroups).slice(0, 3).join(", ");
    const remainingCount = blogCount - 3;

    const body =
      blogCount <= 3 ? `${topBlogs}` : `${topBlogs} 외 ${remainingCount}개`;

    // 요약 알림 메시지
    const message = {
      notification: {
        title: `오늘의 새 글 ${totalCount}개`,
        body: body,
      },
      data: {
        type: "daily_summary",
        count: totalCount.toString(),
        blogs: JSON.stringify(Object.keys(blogGroups)),
      },
      topic: "daily_summary",
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: totalCount,
          },
        },
      },
      android: {
        priority: "default",
        notification: {
          sound: "default",
          channelId: "daily_summary",
        },
      },
    };

    await admin.messaging().send(message);
    console.log(`✅ [일일 요약] ${totalCount}개 글, ${blogCount}개 블로그`);

    return { success: true, count: totalCount };
  } catch (error) {
    console.error("❌ [일일 요약 실패]:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 새 글이 추가될 때 알림 전송 로직
 * - 인기 블로그: 즉시 알림
 * - 기타 블로그: 일일 요약에 포함
 */
export async function processNewArticleNotification(article) {
  // 인기 블로그인지 확인
  const isPopularBlog = INSTANT_NOTIFICATION_BLOGS.includes(article.author);

  if (isPopularBlog) {
    // 즉시 알림 전송
    return await sendInstantNotification(article);
  } else {
    // 일일 요약에 포함 (나중에 배치 처리)
    console.log(`📦 [일일 요약 대기] ${article.author}: ${article.title}`);
    return { success: true, queued: true };
  }
}

/**
 * 크롤링 완료 후 일일 요약 전송
 * @param {Array} allNewArticles - 모든 새 글 목록
 */
export async function sendBatchNotifications(allNewArticles) {
  if (allNewArticles.length === 0) {
    console.log("📭 새 글이 없어 알림을 전송하지 않습니다.");
    return { success: true, skipped: true, count: 0 };
  }

  // 인기 블로그 글은 이미 개별 알림 전송됨
  // 나머지 글들만 모아서 일일 요약 전송
  const summaryArticles = allNewArticles.filter(
    (article) => !INSTANT_NOTIFICATION_BLOGS.includes(article.author),
  );

  if (summaryArticles.length > 0) {
    const result = await sendDailySummaryNotification(summaryArticles);
    if (!result.success) return result;
    console.log(`\n📊 알림 전송 완료: 총 ${allNewArticles.length}개 글 처리`);
    return result;
  }

  return { success: true, skipped: true, count: 0 };
}

// 초기화
initializeFirebase();
