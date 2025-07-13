"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Bookmark } from "lucide-react";

interface BookmarkButtonProps {
  blogId: number;
  onLoginClick: () => void;
}

export function BookmarkButton({ blogId, onLoginClick }: BookmarkButtonProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [isBookmarked, setIsBookmarked] = useState(false);

  const handleBookmarkClick = () => {
    if (!isAuthenticated) {
      // 로그인이 안 되어 있으면 로그인 모달 띄우기
      onLoginClick();
      toast({
        title: "로그인 필요",
        description: "북마크 기능을 사용하려면 로그인이 필요합니다.",
      });
      return;
    }

    // 로그인이 되어 있으면 북마크 토글 (임시 구현)
    setIsBookmarked(!isBookmarked);
    toast({
      title: isBookmarked ? "북마크 해제" : "북마크 추가",
      description: isBookmarked
        ? "북마크에서 제거되었습니다."
        : "북마크에 추가되었습니다.",
    });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleBookmarkClick}
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
