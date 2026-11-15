import { BookmarkApiError } from "./errors";

export type BookmarkPagination = { offset: number; limit: number };

function invalidParameter(): BookmarkApiError {
  return new BookmarkApiError(
    400,
    "INVALID_PARAMETER",
    "요청한 값이 올바르지 않습니다.",
  );
}

function parseInteger(value: string): number {
  if (!/^(0|[1-9]\d*)$/.test(value)) throw invalidParameter();
  const number = Number(value);
  if (!Number.isSafeInteger(number)) throw invalidParameter();
  return number;
}

export function parseBlogId(value: string): number {
  const blogId = parseInteger(value);
  if (blogId < 1) throw invalidParameter();
  return blogId;
}

export function parsePagination(
  request: Request,
  maxLimit: number,
): BookmarkPagination {
  const params = new URL(request.url).searchParams;
  if (params.getAll("offset").length > 1 || params.getAll("limit").length > 1) {
    throw invalidParameter();
  }
  const offset = parseInteger(params.get("offset") ?? "0");
  const limit = parseInteger(params.get("limit") ?? String(maxLimit));
  if (limit < 1 || limit > maxLimit || offset > 2_147_483_647 - maxLimit) {
    throw invalidParameter();
  }
  return { offset, limit };
}
