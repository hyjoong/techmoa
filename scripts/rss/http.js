const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

// 헤더 수신뿐 아니라 리다이렉트와 본문 읽기까지 하나의 제한 시간을 적용한다.
// 오류 응답도 취소하여 끝난 작업의 HTTP 소켓이 프로세스를 붙잡지 않게 한다.
export async function fetchTextWithTimeout(
  url,
  { headers, timeoutMs = 10000, maxRedirects = 5 } = {},
) {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  timeout.unref?.();

  try {
    let currentUrl = url;
    for (let redirects = 0; ; redirects++) {
      const response = await fetch(currentUrl, {
        headers,
        redirect: "manual",
        signal: controller.signal,
      });
      const location = response.headers.get("location");
      if (REDIRECT_STATUSES.has(response.status) && location) {
        await response.body?.cancel();
        if (redirects >= maxRedirects) {
          throw new Error(
            `HTTP 리다이렉트가 ${maxRedirects}회를 초과했습니다.`,
          );
        }
        currentUrl = new URL(location, currentUrl).href;
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.text();
    }
  } catch (error) {
    if (timedOut) {
      throw new Error(
        `HTTP 요청 또는 본문 읽기가 ${timeoutMs}ms를 초과했습니다.`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    controller.abort();
  }
}
