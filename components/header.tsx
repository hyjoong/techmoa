"use client";

import Link from "next/link";
import { Bookmark, Github, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/auth/user-menu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isFlutterWebView } from "@/lib/webview-bridge";

interface HeaderProps {
  onLoginClick: () => void;
}

export function Header({ onLoginClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between gap-3 px-4">
        <Link
          href="/"
          className="text-xl font-black tracking-tight text-blue-600 transition-opacity hover:opacity-80 dark:text-blue-400"
          aria-label="Techmoa 홈"
        >
          Techmoa
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4" aria-label="주 메뉴">
          {!isFlutterWebView() && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/bookmarks" aria-label="북마크한 글">
                <Bookmark className="h-4 w-4" />
                <span className="ml-2 hidden sm:inline">북마크</span>
              </Link>
            </Button>
          )}
          <ThemeToggle />
          {!isFlutterWebView() && <UserMenu onLoginClick={onLoginClick} />}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="서비스 메뉴">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/terms">서비스 이용약관</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/privacy">개인정보 처리방침</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a
                  href="https://github.com/hyjoong/techmoa"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="mr-2 h-4 w-4" />
                  GitHub
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>
      </div>
    </header>
  );
}
