"use client";

import { Building2, User } from "lucide-react";

interface BlogTypeToggleProps {
  blogType: "company" | "personal";
  onBlogTypeChange: (type: "company" | "personal") => void;
}

export function BlogTypeToggle({
  blogType,
  onBlogTypeChange,
}: BlogTypeToggleProps) {
  return (
    <div className="relative bg-muted/50 border border-border/50 rounded-xl p-1">
      {/* 슬라이더 배경 */}
      <div
        className={`absolute top-1 bottom-1 rounded-lg bg-background border border-border/50 shadow-sm transition-all duration-300 ease-out ${
          blogType === "company"
            ? "left-1 w-[calc(50%-0.25rem)]"
            : "right-1 w-[calc(50%-0.25rem)]"
        }`}
      />

      {/* 버튼들 */}
      <div className="relative flex">
        <button
          onClick={() => onBlogTypeChange("company")}
          className={`relative flex items-center justify-center px-3 md:px-4 py-1.5 md:py-2 rounded-lg transition-all duration-300 font-medium z-10 whitespace-nowrap ${
            blogType === "company" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          기업
        </button>
        <button
          onClick={() => onBlogTypeChange("personal")}
          className={`relative flex items-center justify-center px-3 md:px-4 py-1.5 md:py-2 rounded-lg transition-all duration-300 font-medium z-10 whitespace-nowrap ${
            blogType === "personal" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          개인
        </button>
      </div>
    </div>
  );
}
