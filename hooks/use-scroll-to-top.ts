import { useCallback } from "react";

export function useScrollToTop() {
  const scrollToTop = useCallback(() => {
    // iOS Safari 대응
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

    if (isIOS) {
      // iOS에서는 즉시 스크롤 + 약간의 지연 후 재시도
      window.scrollTo(0, 0);
      setTimeout(() => {
        window.scrollTo(0, 0);
      }, 100);
    } else {
      // 다른 기기에서는 부드러운 스크롤
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  return scrollToTop;
}
