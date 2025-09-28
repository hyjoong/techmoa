"use client";

import React, { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Switch } from "@/components/ui/switch";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-6 w-11 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
      </div>
    );
  }

  const isDark = resolvedTheme === "dark";
  const isSystemMode = theme === "system";

  const handleToggle = () => {
    if (isSystemMode) {
      // 시스템 모드일 때는 현재 resolvedTheme의 반대로 설정
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    } else {
      // 수동 모드일 때는 단순 토글
      setTheme(theme === "dark" ? "light" : "dark");
    }
  };

  const handleSystemReset = () => {
    setTheme("system");
  };

  return (
    <div className="relative flex items-center">
      <Switch
        checked={isDark}
        onCheckedChange={handleToggle}
        className="data-[state=checked]:bg-slate-800 data-[state=unchecked]:bg-slate-200"
      />
      {/* 동그라미 안에 아이콘 */}
      <div className="absolute inset-y-0 left-0.5 flex items-center pointer-events-none">
        <div className={`flex items-center justify-center w-5 h-5 transition-transform duration-200 ease-in-out ${isDark ? 'translate-x-5' : 'translate-x-0'}`}>
          <Sun className={`h-3 w-3 transition-all duration-200 ${isDark ? 'opacity-0 scale-75' : 'opacity-100 scale-100'} text-amber-600`} />
          <Moon className={`h-3 w-3 transition-all duration-200 absolute ${isDark ? 'opacity-100 scale-100' : 'opacity-0 scale-75'} text-slate-600`} />
        </div>
      </div>
    </div>
  );
}
