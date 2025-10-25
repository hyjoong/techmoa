import type {
  BookmarkPayload,
  SaveBookmarkResponse,
  RemoveBookmarkResponse,
  CheckBookmarkResponse,
  ShareArticlePayload,
  ShareArticleResponse,
  DeviceInfoResponse,
} from "./types/webview";

// 타임아웃 설정 (5초)
const CALL_HANDLER_TIMEOUT = 5000;

/**
 * Flutter WebView 환경인지 감지
 */
export function isFlutterWebView(): boolean {
  return typeof window !== "undefined" && !!window.flutter_inappwebview;
}

/**
 * Flutter 핸들러 호출 (타임아웃 포함)
 */
async function callFlutterHandler<T>(
  handlerName: string,
  payload?: any
): Promise<T> {
  if (!isFlutterWebView()) {
    throw new Error("Flutter WebView 환경이 아닙니다.");
  }

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Flutter 핸들러 타임아웃: ${handlerName}`));
    }, CALL_HANDLER_TIMEOUT);
  });

  const handlerPromise = window.flutter_inappwebview!.callHandler<T>(
    handlerName,
    payload
  );

  return Promise.race([handlerPromise, timeoutPromise]);
}

/**
 * 북마크 저장 (Flutter)
 */
export async function saveBookmarkToApp(
  payload: BookmarkPayload
): Promise<SaveBookmarkResponse> {
  try {
    const response = await callFlutterHandler<SaveBookmarkResponse>(
      "saveBookmark",
      payload
    );
    return response;
  } catch (error) {
    console.error("saveBookmark 호출 실패:", error);
    return { success: false };
  }
}

/**
 * 북마크 제거 (Flutter)
 */
export async function removeBookmarkFromApp(
  id: string
): Promise<RemoveBookmarkResponse> {
  try {
    const response = await callFlutterHandler<RemoveBookmarkResponse>(
      "removeBookmark",
      { id }
    );
    return response;
  } catch (error) {
    console.error("removeBookmark 호출 실패:", error);
    return { success: false };
  }
}

/**
 * 북마크 상태 확인 (Flutter)
 */
export async function checkBookmarkInApp(
  id: string
): Promise<CheckBookmarkResponse> {
  try {
    const response = await callFlutterHandler<CheckBookmarkResponse>(
      "checkBookmark",
      { id }
    );
    return response;
  } catch (error) {
    console.error("checkBookmark 호출 실패:", error);
    return { isBookmarked: false };
  }
}

/**
 * 공유 기능 (Flutter)
 */
export async function shareArticleInApp(
  payload: ShareArticlePayload
): Promise<ShareArticleResponse> {
  try {
    const response = await callFlutterHandler<ShareArticleResponse>(
      "shareArticle",
      payload
    );
    return response;
  } catch (error) {
    console.error("shareArticle 호출 실패:", error);
    return { success: false };
  }
}

/**
 * 디바이스 정보 가져오기 (Flutter)
 */
export async function getDeviceInfo(): Promise<DeviceInfoResponse | null> {
  try {
    const response = await callFlutterHandler<DeviceInfoResponse>(
      "getDeviceInfo"
    );
    return response;
  } catch (error) {
    console.error("getDeviceInfo 호출 실패:", error);
    return null;
  }
}
