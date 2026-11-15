export class BookmarkApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "BookmarkApiError";
  }
}

export function databaseError(): BookmarkApiError {
  return new BookmarkApiError(
    503,
    "BOOKMARK_SERVICE_UNAVAILABLE",
    "북마크를 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  );
}
