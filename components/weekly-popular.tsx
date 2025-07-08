import { Blog, incrementViews } from "@/lib/supabase";
import Link from "next/link";
import Image from "next/image";
import { getLogoUrl } from "@/lib/logos";
import { Eye } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface WeeklyPopularProps {
  blogs: Blog[];
}

// 숫자 포맷팅 함수
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

// 등수별 스타일
const rankStyles: { [key: number]: string } = {
  1: "text-yellow-500 dark:text-yellow-400",
  2: "text-slate-400 dark:text-slate-300",
  3: "text-amber-600 dark:text-amber-500",
  4: "text-slate-600 dark:text-slate-400",
  5: "text-slate-600 dark:text-slate-400",
  6: "text-slate-600 dark:text-slate-400",
  7: "text-slate-600 dark:text-slate-400",
  8: "text-slate-600 dark:text-slate-400",
  9: "text-slate-600 dark:text-slate-400",
  10: "text-slate-600 dark:text-slate-400",
};

export function WeeklyPopular({ blogs }: WeeklyPopularProps) {
  const handleLinkClick = async (blogId: number) => {
    // 조회수 증가 (백그라운드에서 실행)
    try {
      incrementViews(blogId);
    } catch (error) {
      console.error("조회수 증가 실패:", error);
    }
  };

  return (
    <div className="hidden xl:block w-96 flex-shrink-0">
      <div className="sticky top-24 h-[calc(100vh-8rem)]">
        <h2 className="text-lg font-bold mb-4 text-slate-900 dark:text-slate-100">
          주간 인기글 TOP 10
        </h2>
        <ScrollArea className="h-[calc(100%-3rem)] pr-4">
          <div className="space-y-3">
            {blogs.map((blog, index) => (
              <Link
                key={blog.id}
                href={blog.external_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => handleLinkClick(blog.id)}
              >
                <div className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors p-4 -mx-4">
                  <div className="flex items-start gap-4">
                    {/* 등수 */}
                    <div
                      className={`text-2xl font-bold ${
                        rankStyles[(index + 1) as keyof typeof rankStyles]
                      }`}
                    >
                      {index + 1}
                    </div>
                    {/* 블로그 로고 */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                        {getLogoUrl(blog.author) ? (
                          <Image
                            src={getLogoUrl(blog.author)!}
                            alt={blog.author}
                            width={40}
                            height={40}
                          />
                        ) : (
                          <Image
                            src={
                              blog.blog_type === "personal"
                                ? "/placeholder-user.jpg"
                                : "/placeholder-logo.svg"
                            }
                            alt={blog.author}
                            width={40}
                            height={40}
                          />
                        )}
                      </div>
                    </div>
                    {/* 블로그 정보 */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-2 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {blog.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span>{blog.author}</span>
                        <span>·</span>
                        <div className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />
                          <span>{formatNumber(blog.views)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
