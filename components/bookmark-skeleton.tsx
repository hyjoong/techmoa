import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface BookmarkSkeletonProps {
  viewMode: "card" | "list";
  count?: number;
}

export function BookmarkSkeleton({
  viewMode,
  count = 6,
}: BookmarkSkeletonProps) {
  if (viewMode === "card") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i} className="h-full">
            <CardContent className="p-6">
              {/* 썸네일 스켈레톤 */}
              <div className="relative aspect-video overflow-hidden rounded-lg bg-muted mb-4">
                <Skeleton className="absolute inset-0" />
              </div>

              {/* 제목 스켈레톤 */}
              <Skeleton className="h-6 w-3/4 mb-3" />

              {/* 작성자 스켈레톤 */}
              <div className="flex items-center gap-2 mb-3">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-4 w-24" />
              </div>

              {/* 요약 스켈레톤 */}
              <div className="space-y-2 mb-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>

              {/* 메타 정보 스켈레톤 */}
              <div className="flex items-center gap-4 pt-2 border-t border-border/30">
                <div className="flex items-center gap-1">
                  <Skeleton className="h-3 w-3" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <div className="flex items-center gap-1">
                  <Skeleton className="h-3 w-3" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <div className="flex gap-6">
              {/* 썸네일 스켈레톤 */}
              <div className="hidden sm:block relative w-48 h-32 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                <Skeleton className="absolute inset-0" />
              </div>

              {/* 콘텐츠 영역 */}
              <div className="flex-1 min-w-0">
                {/* 제목 스켈레톤 */}
                <Skeleton className="h-7 w-3/4 mb-3" />

                {/* 요약 스켈레톤 */}
                <div className="space-y-2 mb-4">
                  <Skeleton className="h-5 w-full" />
                  <Skeleton className="h-5 w-5/6" />
                </div>

                {/* 메타 정보 스켈레톤 */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-12" />
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
