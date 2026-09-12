import { type Blog, incrementViews } from "@/lib/supabase";
import { ChevronDown, ChevronRight, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatViews } from "@/lib/format";

interface WeeklyPopularProps {
  blogs: Blog[];
  loading?: boolean;
  error?: boolean;
  compact?: boolean;
  onRetry?: () => void;
  onCollapse?: () => void;
}

export function WeeklyPopular({
  blogs,
  loading,
  error,
  compact,
  onRetry,
  onCollapse,
}: WeeklyPopularProps) {
  const content = loading ? (
    <div className="space-y-4 p-4" aria-label="인기글 로딩 중" aria-busy="true">
      {[1, 2, 3].map((rank) => (
        <div key={rank} className="h-14 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  ) : error ? (
    <div role="alert" className="p-4 text-center">
      <p className="mb-3 text-sm text-muted-foreground">
        인기글을 불러오지 못했습니다.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        다시 시도
      </Button>
    </div>
  ) : blogs.length === 0 ? (
    <p className="p-4 text-sm text-muted-foreground">
      최근 일주일간 등록된 글이 없습니다.
    </p>
  ) : (
    <ol className="divide-y divide-border px-4">
      {blogs.map((blog, index) => (
        <li key={blog.id}>
          <a
            href={blog.external_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              void incrementViews(blog.id);
            }}
            className="group flex gap-3 rounded-lg py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              className={`w-5 shrink-0 pt-0.5 text-center text-lg font-bold tabular-nums ${index < 3 ? "text-primary" : "text-muted-foreground"}`}
            >
              {index + 1}
            </span>
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-sm font-medium leading-relaxed group-hover:text-primary">
                {blog.title}
              </h3>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {blog.author} · 조회 {formatViews(blog.views)}
              </p>
            </div>
          </a>
        </li>
      ))}
    </ol>
  );

  if (compact)
    return (
      <details className="group mb-6 rounded-xl border border-border bg-card xl:hidden">
        <summary className="flex cursor-pointer list-none items-center gap-2 p-4 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          <TrendingUp className="h-4 w-4 text-primary" />
          이번 주 인기글
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            TOP 10
          </span>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        {content}
      </details>
    );

  return (
    <aside
      aria-label="주간 인기글"
      className="sticky top-24 hidden w-80 shrink-0 overflow-hidden rounded-xl border border-border bg-card xl:block"
    >
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <TrendingUp className="h-4 w-4 text-primary" />
            이번 주 인기글
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            최근 7일 발행된 글 · 조회순
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onCollapse}
          aria-label="인기글 접기"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="max-h-[calc(100dvh-14rem)] overflow-y-auto">
        {content}
      </div>
    </aside>
  );
}
