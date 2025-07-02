import Link from "next/link";
import { Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <h3 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-2">
              Techmoa
            </h3>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 text-sm">
            <Link
              href="/terms"
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              서비스 이용약관
            </Link>
            <Link
              href="/privacy"
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              개인정보 처리방침
            </Link>
            <a
              href="https://github.com/hyjoong/techmoa"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
              title="GitHub"
            >
              <Github className="h-5 w-5" />
            </a>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-200/50 dark:border-slate-700/50 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-500">
            © 2025 Techmoa. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
