import { authenticateBookmarkRequest } from "./auth";
import { BookmarkApiError } from "./errors";
import { BookmarkRepository } from "./repository";
import { BookmarkService } from "./service";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store",
  Vary: "Authorization",
};

export function bookmarkJson(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: PRIVATE_HEADERS });
}

export function bookmarkNoContent(): Response {
  return new Response(null, { status: 204, headers: PRIVATE_HEADERS });
}

export async function withBookmarkService(
  request: Request,
  handle: (service: BookmarkService) => Promise<Response>,
): Promise<Response> {
  try {
    const { client, userId } = await authenticateBookmarkRequest(request);
    return await handle(
      new BookmarkService(new BookmarkRepository(client, userId)),
    );
  } catch (error: unknown) {
    if (error instanceof BookmarkApiError) {
      return bookmarkJson(
        { error: { message: error.message, code: error.code } },
        error.status,
      );
    }
    return bookmarkJson(
      {
        error: {
          message: "북마크 처리 중 오류가 발생했습니다.",
          code: "INTERNAL_ERROR",
        },
      },
      500,
    );
  }
}
