import { bookmarkJson, withBookmarkService } from "@/lib/server/bookmarks/http";
import { parsePagination } from "@/lib/server/bookmarks/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  return withBookmarkService(request, async (service) => {
    return bookmarkJson(await service.listIds(parsePagination(request, 1000)));
  });
}
