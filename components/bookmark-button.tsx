"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
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
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  // 북마크 상태 확인
  useEffect(() => {
    // 웹뷰 환경이거나 로그인된 경우 북마크 상태 확인
    if (isFlutterWebView() || isAuthenticated) {
      checkBookmarkStatus();
    }
  }, [isAuthenticated, blogId]);

  const checkBookmarkStatus = async () => {
    try {
      const bookmarked = await checkIsBookmarked(blogId);
      setIsBookmarked(bookmarked);
    } catch (error) {
      console.error("북마크 상태 확인 실패:", error);
    }
  };

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
    } catch (error: any) {
      console.error("북마크 처리 실패:", error);
      toast({
        title: "오류",
        description: error.message || "북마크 처리에 실패했습니다.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBookmarkClick}
      disabled={loading}
      className={`p-2 h-auto ${
        isBookmarked
          ? "text-yellow-500 hover:text-yellow-600"
          : "text-slate-400 hover:text-slate-600"
      }`}
    >
      <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
    </Button>
  );
}
