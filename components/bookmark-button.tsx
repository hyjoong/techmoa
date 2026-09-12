"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useBookmarks } from "@/components/bookmark-provider";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Bookmark } from "lucide-react";
import {
  addBookmark,
  removeBookmark,
  isBookmarked as checkIsBookmarked,
} from "@/lib/bookmarks";
import { isFlutterWebView } from "@/lib/webview-bridge";

interface BookmarkButtonProps {
  blogId: number;
  onLoginClick: () => void;
  onBookmarkRemoved?: () => void;
}

export function BookmarkButton({
  blogId,
  onLoginClick,
  onBookmarkRemoved,
}: BookmarkButtonProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const bookmarks = useBookmarks();
  const [appBookmarked, setAppBookmarked] = useState(false);
  const isApp = isFlutterWebView();
  const isBookmarked = isApp ? appBookmarked : bookmarks.ids.has(blogId);
  const setIsBookmarked = (value: boolean): void => {
    if (isApp) setAppBookmarked(value);
    else bookmarks.setBookmarked(blogId, value);
  };
  const [loading, setLoading] = useState(false);

  // 앱은 기존 브리지를 사용하고 웹은 공유된 북마크 목록을 사용한다.
  useEffect(() => {
    let active = true;
    if (isApp)
      void checkIsBookmarked(blogId)
        .then((value) => {
          if (active) setAppBookmarked(value);
        })
        .catch(() => {
          if (active) setAppBookmarked(false);
        });
    return () => {
      active = false;
    };
  }, [isApp, blogId]);

  const handleBookmarkClick = async () => {
    // 웹뷰가 아닌 환경에서 로그인 체크
    if (!isFlutterWebView() && !isAuthenticated) {
      // 로그인이 안 되어 있으면 로그인 모달 띄우기
      onLoginClick();
      toast({
        title: "로그인 필요",
        description: "북마크 기능을 사용하려면 로그인이 필요합니다.",
      });
      return;
    }

    if (!isApp && bookmarks.error) {
      bookmarks.retry();
      toast({
        title: "북마크 확인",
        description: "저장 상태를 다시 확인합니다. 잠시 후 눌러주세요.",
      });
      return;
    }
    setLoading(true);
    try {
      if (isBookmarked) {
        // 북마크 제거
        const { error } = await removeBookmark(blogId);
        if (error) throw error;

        setIsBookmarked(false);
        toast({
          title: "북마크 해제",
          description: "북마크에서 제거되었습니다.",
        });
        // 북마크 제거 콜백 호출
        onBookmarkRemoved?.();
      } else {
        // 북마크 추가
        const { error } = await addBookmark(blogId);
        if (error) throw error;

        setIsBookmarked(true);
        toast({
          title: "북마크 추가",
          description: "북마크에 추가되었습니다.",
        });
      }
    } catch (error: unknown) {
      console.error("북마크 처리 실패:", error);
      toast({
        title: "오류",
        description:
          error instanceof Error
            ? error.message
            : "북마크 처리에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const bookmarkLabel = loading
    ? "북마크 처리 중"
    : isBookmarked
      ? "북마크 해제"
      : "북마크 추가";

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={handleBookmarkClick}
      disabled={loading || (!isApp && bookmarks.loading)}
      aria-label={bookmarkLabel}
      aria-pressed={isBookmarked}
      aria-busy={loading}
      className={`p-2 h-auto bg-background/80 shadow-sm backdrop-blur-sm hover:bg-background ${
        isBookmarked
          ? "text-yellow-500 hover:text-yellow-600"
          : "text-slate-400 hover:text-slate-600"
      }`}
    >
      <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
    </Button>
  );
}
