import { supabase } from "./supabase";
import type { Blog } from "./supabase";
import {
  isFlutterWebView,
  saveBookmarkToApp,
  removeBookmarkFromApp,
} from "./webview-bridge";
import type { BookmarkPayload } from "./types/webview";

import type {
  Bookmark,
  BookmarkError,
  BookmarkResponse,
  BookmarkListResponse,
  BookmarkedBlogsResponse,
  BookmarkPage,
  BookmarkIdsPage,
} from "./types/bookmarks";
export type {
  Bookmark,
  BookmarkedBlog,
  BookmarkError,
  BookmarkResponse,
  BookmarkListResponse,
  BookmarkedBlogsResponse,
} from "./types/bookmarks";

type RequestContext = {
  accessToken: string;
  userId: string;
  signal?: AbortSignal;
};

class BookmarkRequestError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }
}

async function createRequestContext(
  signal?: AbortSignal,
): Promise<RequestContext> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    throw new BookmarkRequestError("로그인이 필요합니다.", "UNAUTHORIZED");
  }
  return {
    accessToken: data.session.access_token,
    userId: data.session.user.id,
    signal,
  };
}

async function requestBookmarkApi<T>(
  path: string,
  context: RequestContext,
  method: "GET" | "PUT" | "DELETE" = "GET",
): Promise<T> {
  const response = await fetch(`/api/me/bookmarks${path}`, {
    method,
    headers: { Authorization: `Bearer ${context.accessToken}` },
    cache: "no-store",
    credentials: "omit",
    signal: context.signal,
  });
  // 여러 페이지를 읽는 도중 계정이 바뀌면 서로 다른 사용자의 결과를 섞지 않는다.
  const { data, error } = await supabase.auth.getSession();
  if (error || data.session?.user.id !== context.userId) {
    throw new BookmarkRequestError(
      "로그인 정보가 변경되었습니다.",
      "SESSION_CHANGED",
    );
  }
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const apiError =
      body && typeof body === "object" && "error" in body ? body.error : null;
    const message =
      apiError &&
      typeof apiError === "object" &&
      "message" in apiError &&
      typeof apiError.message === "string"
        ? apiError.message
        : "북마크 요청에 실패했습니다. 다시 시도해주세요.";
    const code =
      apiError &&
      typeof apiError === "object" &&
      "code" in apiError &&
      typeof apiError.code === "string"
        ? apiError.code
        : "REQUEST_FAILED";
    throw new BookmarkRequestError(message, code);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

function toBookmarkError(error: unknown): BookmarkError {
  if (error instanceof BookmarkRequestError) {
    return { message: error.message, code: error.code };
  }
  return {
    message: "북마크 요청에 실패했습니다. 다시 시도해주세요.",
    code: "REQUEST_FAILED",
  };
}

function validateNextOffset(nextOffset: number | null, offset: number): void {
  if (
    nextOffset !== null &&
    (!Number.isSafeInteger(nextOffset) || nextOffset <= offset)
  ) {
    throw new BookmarkRequestError(
      "북마크 목록을 불러오지 못했습니다.",
      "INVALID_RESPONSE",
    );
  }
}

/**
 * Blog 객체를 BookmarkPayload로 변환
 */
function blogToPayload(blog: Partial<Blog> & { id: number }): BookmarkPayload {
  return {
    id: String(blog.id),
    title: blog.title || "",
    external_url: blog.external_url || "",
    author: blog.author || undefined,
    thumbnail_url: blog.thumbnail_url || undefined,
    published_at: blog.published_at || undefined,
  };
}

/**
 * blogId로 블로그 정보를 조회하여 BookmarkPayload 생성
 */
async function getBlogPayload(blogId: number): Promise<BookmarkPayload | null> {
  const { data, error } = await supabase
    .from("blogs")
    .select("id, title, external_url, author, thumbnail_url, published_at")
    .eq("id", blogId)
    .single();

  if (error || !data) {
    console.error("블로그 정보 조회 실패:", error);
    return null;
  }

  return blogToPayload(data);
}

// 북마크 추가
export async function addBookmark(blogId: number): Promise<BookmarkResponse> {
  // Flutter 웹뷰 환경: 앱으로 메시지 전송
  if (isFlutterWebView()) {
    const payload = await getBlogPayload(blogId);
    if (!payload) {
      return {
        bookmark: null,
        error: { message: "블로그 정보를 찾을 수 없습니다." },
      };
    }

    const response = await saveBookmarkToApp(payload);
    if (response.success) {
      return {
        bookmark: {
          id: payload.id,
          user_id: "flutter_app_user", // 앱 환경에서는 user_id 불필요
          blog_id: blogId,
          created_at: new Date().toISOString(),
        },
        error: null,
      };
    } else {
      return {
        bookmark: null,
        error: { message: "북마크 저장에 실패했습니다." },
      };
    }
  }

  try {
    const context = await createRequestContext();
    const { bookmark } = await requestBookmarkApi<{ bookmark: Bookmark }>(
      `/${blogId}`,
      context,
      "PUT",
    );
    return { bookmark, error: null };
  } catch (error: unknown) {
    return { bookmark: null, error: toBookmarkError(error) };
  }
}

// 북마크 제거
export async function removeBookmark(
  blogId: number,
): Promise<{ error: BookmarkError | null }> {
  // Flutter 웹뷰 환경: 앱으로 메시지 전송
  if (isFlutterWebView()) {
    const response = await removeBookmarkFromApp(String(blogId));
    if (response.success) {
      return { error: null };
    } else {
      return { error: { message: "북마크 제거에 실패했습니다." } };
    }
  }

  try {
    const context = await createRequestContext();
    await requestBookmarkApi<void>(`/${blogId}`, context, "DELETE");
    return { error: null };
  } catch (error: unknown) {
    return { error: toBookmarkError(error) };
  }
}

// 카드마다 요청하지 않고 로그인한 사용자의 북마크 ID를 함께 가져온다.
export async function getUserBookmarks(
  signal?: AbortSignal,
): Promise<BookmarkListResponse> {
  try {
    const context = await createRequestContext(signal);
    const ids = new Set<number>();
    let offset = 0;
    while (true) {
      const page = await requestBookmarkApi<BookmarkIdsPage>(
        `/ids?offset=${offset}&limit=1000`,
        context,
      );
      page.ids.forEach((id) => ids.add(id));
      validateNextOffset(page.nextOffset, offset);
      if (page.nextOffset === null) break;
      offset = page.nextOffset;
    }
    return {
      bookmarks: Array.from(ids, (blog_id) => ({ blog_id })),
      error: null,
    };
  } catch (error: unknown) {
    return { bookmarks: [], error: toBookmarkError(error) };
  }
}

// 검색과 정렬이 전체 북마크에 적용되도록 서버의 제한된 페이지를 끝까지 읽는다.
export async function getBookmarkedBlogs(
  signal?: AbortSignal,
): Promise<BookmarkedBlogsResponse> {
  try {
    const context = await createRequestContext(signal);
    const blogs = new Map<number, BookmarkPage["blogs"][number]>();
    let offset = 0;
    while (true) {
      const page = await requestBookmarkApi<BookmarkPage>(
        `?offset=${offset}&limit=100`,
        context,
      );
      page.blogs.forEach((blog) => blogs.set(blog.id, blog));
      validateNextOffset(page.nextOffset, offset);
      if (page.nextOffset === null) break;
      offset = page.nextOffset;
    }
    return { blogs: Array.from(blogs.values()), error: null };
  } catch (error: unknown) {
    return { blogs: [], error: toBookmarkError(error) };
  }
}
