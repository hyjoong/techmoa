import {
  bookmarkJson,
  bookmarkNoContent,
  withBookmarkService,
} from "@/lib/server/bookmarks/http";
import { parseBlogId } from "@/lib/server/bookmarks/validation";

export const dynamic = "force-dynamic";

type BookmarkRouteContext = { params: Promise<{ blogId: string }> };

export async function PUT(
  request: Request,
  context: BookmarkRouteContext,
): Promise<Response> {
  return withBookmarkService(request, async (service) => {
    const blogId = parseBlogId((await context.params).blogId);
    return bookmarkJson({ bookmark: await service.save(blogId) });
  });
}

export async function DELETE(
  request: Request,
  context: BookmarkRouteContext,
): Promise<Response> {
  return withBookmarkService(request, async (service) => {
    const blogId = parseBlogId((await context.params).blogId);
    await service.remove(blogId);
    return bookmarkNoContent();
  });
}
