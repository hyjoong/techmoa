"use client";

import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";

export function CommonHeader() {
  return (
    <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 border-b border-slate-200/50 dark:border-slate-700/50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link href="/" className="hover:opacity-80 transition-opacity">
            <h1 className="text-2xl font-black text-blue-600 dark:text-blue-400">
              Techmoa
            </h1>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
