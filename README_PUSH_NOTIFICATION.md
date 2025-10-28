# 🔔 푸시 알림 기능 추가 완료!

앱스토어 재심사를 위해 **푸시 알림** 기능이 추가되었습니다.

## 📱 알림 방식

### 즉시 알림 (인기 블로그 10개)

토스, 카카오, 우아한형제들 등 인기 블로그의 새 글은 **즉시 개별 알림**

```
토스 - 새 글
React Query로 서버 상태 관리하기
```

### 일일 요약 알림 (나머지 블로그)

기타 블로그는 **하루 2회 요약 알림**

```
오늘의 새 글 12개
카카오, 무신사, 당근 외 9개
```

---

## 🚀 빠른 시작

### 1. 패키지 설치

```bash
pnpm install
```

### 2. Firebase 설정

1. [Firebase Console](https://console.firebase.google.com)에서 프로젝트 생성
2. 서비스 계정 키 생성 (JSON 파일)
3. GitHub Secrets에 `FIREBASE_SERVICE_ACCOUNT_KEY` 추가

📖 **자세한 설명**: [docs/PUSH_NOTIFICATION_SETUP.md](docs/PUSH_NOTIFICATION_SETUP.md)

### 3. 테스트

```bash
# 푸시 알림 테스트
pnpm run test:push

# RSS 크롤링 + 알림 (실제 실행)
pnpm run crawl-rss
```

---

## 📂 새로 추가된 파일

```
scripts/
  ├── push-notification.js          # 푸시 알림 로직
  └── test-push-notification.js     # 알림 테스트 스크립트

docs/
  └── PUSH_NOTIFICATION_SETUP.md    # 상세 설정 가이드

.github/workflows/
  └── rss-crawler.yml               # Firebase 환경 변수 추가
```

---

## 🔔 알림 토픽 구조

| 토픽            | 설명            |
| --------------- | --------------- |
| `all_blogs`     | 모든 새 글      |
| `blog_toss`     | 토스 블로그만   |
| `blog_kakao`    | 카카오 블로그만 |
| `daily_summary` | 일일 요약만     |

---

## 📊 GitHub Actions 자동 실행

RSS 크롤러가 **하루 2회** 자동 실행되며, 새 글 발견 시 자동으로 푸시 알림 전송:

- 🌅 오전 7시 (KST)
- 🌆 오후 7시 (KST)

---

## 🧪 테스트 방법

### 로컬 테스트

```bash
# 1. 환경 변수 설정 (.env.local)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'

# 2. 테스트 실행
pnpm run test:push
```

### GitHub Actions 수동 실행

1. GitHub → Actions → "RSS Data Crawler"
2. "Run workflow" 클릭
3. 로그에서 알림 전송 확인

---

## 📱 Flutter 앱 통합 (다음 단계)

Flutter 앱에서 FCM을 통합하여 알림을 수신합니다:

```dart
// Firebase Messaging 초기화
await FirebaseMessaging.instance.requestPermission();

// 토픽 구독
await FirebaseMessaging.instance.subscribeToTopic('all_blogs');

// 알림 수신 처리
FirebaseMessaging.onMessage.listen((RemoteMessage message) {
  print('새 글: ${message.notification?.title}');
});
```

---

## 🎯 앱스토어 심사 대응

### 심사 노트에 포함할 내용

```
✅ 푸시 알림 (Firebase Cloud Messaging)
- 30개 이상 기술 블로그의 새 글 실시간 알림
- 하루 2회 자동 크롤링으로 최신 콘텐츠 제공
- 사용자가 관심 블로그 선택 가능

테스트:
1. 앱 실행 → 알림 권한 허용
2. GitHub Actions에서 크롤링 실행
3. 새 글 발견 시 즉시 알림 수신
```

### 스크린샷 준비

1. 알림 수신 화면 (잠금 화면)
2. 알림 설정 화면
3. 알림 탭 시 해당 글로 이동

---

## ⚠️ 주의사항

### Firebase 키 보안

- ❌ 절대 Git에 커밋하지 마세요
- ✅ GitHub Secrets에만 저장
- ✅ `.gitignore`에 `*firebase*.json` 추가됨

### 알림 빈도

- 너무 많은 알림은 사용자 피로도 증가
- 현재 설정: 인기 블로그만 즉시, 나머지는 요약
- 필요시 `scripts/push-notification.js`에서 조정 가능

---

## 🐛 문제 해결

### "Firebase not initialized" 오류

→ `FIREBASE_SERVICE_ACCOUNT_KEY` 환경 변수 확인

### 알림이 전송되지 않음

→ Firebase Console → Cloud Messaging → Reports 확인

### 앱에서 알림 수신 안 됨

→ 알림 권한, 토픽 구독 상태 확인

자세한 내용: [docs/PUSH_NOTIFICATION_SETUP.md](docs/PUSH_NOTIFICATION_SETUP.md)

---

## 💡 다음 개선 사항

- [ ] 사용자별 알림 빈도 설정
- [ ] 카테고리별 알림 (FE/BE/AI)
- [ ] 방해 금지 시간대 설정
- [ ] 알림 통계 대시보드

---

## 📞 지원

문제가 있으신가요?

- GitHub Issues: [여기에 이슈 생성](https://github.com/hyjoong/techmoa/issues)
- 설정 가이드: [docs/PUSH_NOTIFICATION_SETUP.md](docs/PUSH_NOTIFICATION_SETUP.md)
