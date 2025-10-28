# 📱 푸시 알림 설정 가이드

앱스토어 재심사를 위한 푸시 알림 기능 설정 가이드입니다.

## 🎯 알림 전략

### 즉시 알림 (인기 블로그 10개)

토스, 카카오, 우아한형제들 등 인기 블로그는 **새 글이 올라오는 즉시** 개별 알림 전송

```
📱 토스 - 새 글
React Query로 서버 상태 관리하기
[지금 읽기]
```

### 일일 요약 알림 (나머지 블로그)

기타 블로그는 **하루 2회 배치 처리**로 요약 알림 전송

```
📦 오늘의 새 글 12개
카카오, 무신사, 당근 외 9개
[모두 보기]
```

---

## 📋 설정 단계

### Step 1: Firebase 프로젝트 생성 (5분)

1. **Firebase Console 접속**

   - https://console.firebase.google.com
   - Google 계정으로 로그인

2. **프로젝트 생성**

   ```
   프로젝트 이름: Techmoa
   Google Analytics: 선택 (권장)
   ```

3. **iOS 앱 추가**

   ```
   번들 ID: com.techmoa.app
   앱 닉네임: Techmoa iOS
   ```

   - `GoogleService-Info.plist` 다운로드 (나중에 Flutter 프로젝트에 추가)

4. **Android 앱 추가**
   ```
   패키지 이름: com.techmoa.app
   앱 닉네임: Techmoa Android
   ```
   - `google-services.json` 다운로드 (나중에 Flutter 프로젝트에 추가)

---

### Step 2: Firebase Admin SDK 키 생성 (3분)

1. **서비스 계정 키 생성**

   - Firebase Console → 프로젝트 설정 (톱니바퀴) → 서비스 계정
   - "새 비공개 키 생성" 클릭
   - JSON 파일 다운로드 (`techmoa-firebase-adminsdk.json`)

2. **GitHub Secrets에 등록**

   ```bash
   # JSON 파일 내용을 한 줄로 변환
   cat techmoa-firebase-adminsdk.json | jq -c
   ```

   - GitHub 저장소 → Settings → Secrets and variables → Actions
   - "New repository secret" 클릭
   - Name: `FIREBASE_SERVICE_ACCOUNT_KEY`
   - Secret: 위에서 복사한 JSON 내용 (한 줄)
   - "Add secret" 클릭

---

### Step 3: 패키지 설치 (1분)

```bash
cd /Users/kimhyunjoong/Desktop/techgom
pnpm install
```

이미 `package.json`에 `firebase-admin` 패키지가 추가되어 있습니다.

---

### Step 4: 로컬 테스트 (선택 사항)

로컬에서 푸시 알림을 테스트하려면:

1. **환경 변수 설정**

   ```bash
   # .env.local 파일에 추가
   FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
   ```

2. **테스트 스크립트 실행**
   ```bash
   node scripts/test-push-notification.js
   ```

---

### Step 5: GitHub Actions 자동 실행 확인

1. **수동 실행 테스트**

   - GitHub 저장소 → Actions → "RSS Data Crawler"
   - "Run workflow" 클릭
   - 실행 로그에서 푸시 알림 전송 확인

2. **자동 실행 시간**
   - 오전 7시 (KST): `cron: "0 22 * * *"`
   - 오후 7시 (KST): `cron: "0 10 * * *"`

---

## 🔔 알림 토픽 구조

### 전체 구독자

- `all_blogs`: 모든 새 글 알림 받기

### 블로그별 구독

- `blog_toss`: 토스 블로그만
- `blog_kakao`: 카카오 블로그만
- `blog_woowahan`: 우아한형제들 블로그만
- ...

### 요약 알림

- `daily_summary`: 일일 요약만 받기 (알림 피로도 감소)

---

## 📱 Flutter 앱에서 구독 설정

Flutter 앱에서는 다음과 같이 토픽을 구독합니다:

```dart
import 'package:firebase_messaging/firebase_messaging.dart';

class NotificationService {
  static final FirebaseMessaging _messaging = FirebaseMessaging.instance;

  // 권한 요청
  static Future<void> requestPermission() async {
    NotificationSettings settings = await _messaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );

    if (settings.authorizationStatus == AuthorizationStatus.authorized) {
      print('✅ 알림 권한 승인됨');
    }
  }

  // 전체 구독
  static Future<void> subscribeToAll() async {
    await _messaging.subscribeToTopic('all_blogs');
    print('✅ 전체 알림 구독');
  }

  // 특정 블로그 구독
  static Future<void> subscribeToBlog(String blogName) async {
    final topic = 'blog_${blogName.toLowerCase().replaceAll(' ', '_')}';
    await _messaging.subscribeToTopic(topic);
    print('✅ $blogName 구독');
  }

  // 구독 해제
  static Future<void> unsubscribeFromBlog(String blogName) async {
    final topic = 'blog_${blogName.toLowerCase().replaceAll(' ', '_')}';
    await _messaging.unsubscribeFromTopic(topic);
    print('❌ $blogName 구독 해제');
  }
}
```

---

## 🧪 테스트 방법

### 1. Firebase Console에서 수동 전송

- Firebase Console → Cloud Messaging
- "새 알림 보내기"
- 토픽: `all_blogs` 선택
- 메시지 작성 후 전송

### 2. RSS 크롤러 수동 실행

```bash
# 로컬에서 실행
pnpm run crawl-rss

# GitHub Actions에서 수동 실행
# Actions → RSS Data Crawler → Run workflow
```

### 3. 테스트 스크립트 작성

```javascript
// scripts/test-push-notification.js
import { sendInstantNotification } from "./push-notification.js";

const testArticle = {
  id: 999,
  title: "테스트 알림 - 푸시 기능 확인",
  author: "토스",
  external_url: "https://toss.tech",
};

sendInstantNotification(testArticle);
```

---

## ⚠️ 문제 해결

### 알림이 전송되지 않는 경우

1. **Firebase 키 확인**

   ```bash
   # GitHub Secrets 확인
   # Settings → Secrets → FIREBASE_SERVICE_ACCOUNT_KEY 존재 확인
   ```

2. **GitHub Actions 로그 확인**

   ```
   ✅ Firebase Admin SDK 초기화 완료
   ✅ [즉시 알림] 토스: React Query로 서버 상태 관리하기
   ```

3. **Firebase Console 로그 확인**
   - Cloud Messaging → Reports
   - 전송 성공/실패 통계 확인

### 앱에서 알림 수신 안 되는 경우

1. **권한 확인**

   - iOS: 설정 → Techmoa → 알림 허용
   - Android: 앱 정보 → 알림 → 허용

2. **토픽 구독 확인**
   ```dart
   // 디버그 로그 확인
   FirebaseMessaging.instance.getToken().then((token) {
     print('FCM Token: $token');
   });
   ```

---

## 📊 모니터링

### Firebase Console

- Cloud Messaging → Reports
- 전송 수, 성공률, 오픈율 확인

### GitHub Actions 로그

```
📊 알림 전송 완료: 총 15개 글 처리
✅ [즉시 알림] 토스: ...
✅ [즉시 알림] 카카오: ...
📦 [일일 요약] 12개 글, 8개 블로그
```

---

## 🚀 다음 단계

1. ✅ **백엔드 푸시 알림 완료** (현재)
2. ⏭️ **Flutter 앱에 FCM 통합** (다음)
3. ⏭️ **앱 설정 화면에서 알림 토픽 선택 UI**
4. ⏭️ **앱스토어 재제출**

---

## 📝 App Store 심사 노트에 포함할 내용

```
✅ 푸시 알림 (Firebase Cloud Messaging)
- 30개 이상 기술 블로그의 새 글 실시간 알림
- 하루 2회 자동 크롤링 (오전 7시, 오후 7시 KST)
- 설정: '설정 > 알림'에서 토픽 선택 가능

테스트 방법:
1. 앱 실행 → 알림 권한 허용
2. 자동으로 'all_blogs' 토픽 구독됨
3. GitHub Actions에서 수동 크롤링 실행 → 새 글 발견 시 즉시 알림
4. 또는 Firebase Console에서 테스트 알림 전송 가능
```

---

## 💡 추가 개선 아이디어

1. **관심 카테고리별 알림**
   - `topic_frontend`, `topic_backend`, `topic_ai`
2. **시간대별 알림 설정**
   - 방해 금지 시간 (22:00 ~ 08:00)
3. **즐겨찾기 블로그만 알림**

   - 사용자가 선택한 블로그만 알림

4. **알림 통계**
   - 사용자별 알림 수신/오픈율 분석
