// Flutter WebView 브릿지 타입 정의

export interface BookmarkPayload {
  id: string; // 문자열/숫자 모두 허용 → 문자열 변환 후 사용
  title: string;
  external_url: string;
  author?: string;
  thumbnail_url?: string;
  published_at?: string; // ISO 문자열 권장, 없으면 빈 문자열 처리
}

export interface SaveBookmarkResponse {
  success: boolean;
}

export interface RemoveBookmarkResponse {
  success: boolean;
}

export interface CheckBookmarkResponse {
  isBookmarked: boolean;
}

export interface ShareArticlePayload {
  title?: string;
  url: string;
}

export interface ShareArticleResponse {
  success: boolean;
}

export interface DeviceInfoResponse {
  version: string;
  os: string;
  device: "ios" | "android" | "unknown";
}

// Flutter InAppWebView 글로벌 객체 타입
export interface FlutterInAppWebView {
  callHandler: <T = any>(handlerName: string, ...args: any[]) => Promise<T>;
}

// Window 객체 확장
declare global {
  interface Window {
    flutter_inappwebview?: FlutterInAppWebView;
  }
}
