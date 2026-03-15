import type { Blog } from "./db";
import {
  isFlutterWebView,
  saveBookmarkToApp,
  removeBookmarkFromApp,
  checkBookmarkInApp,
} from "./webview-bridge";
import type { BookmarkPayload } from "./types/webview";

// 북마크 타입 정의
export interface Bookmark {
  id: string;
  user_id: string;
  blog_id: number;
  created_at: string;
}

export interface BookmarkedBlog extends Blog {
  bookmark_id: string;
  bookmark_created_at: string;
}

export interface BookmarkError {
  message: string;
  code?: string;
}

export interface BookmarkResponse {
  bookmark: Bookmark | null;
  error: BookmarkError | null;
}

export interface BookmarkListResponse {
  bookmarks: Bookmark[];
  error: BookmarkError | null;
}

export interface BookmarkedBlogsResponse {
  blogs: BookmarkedBlog[];
  error: BookmarkError | null;
}

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

// 북마크 추가
export async function addBookmark(blogId: number): Promise<BookmarkResponse> {
  if (isFlutterWebView()) {
    try {
      const res = await fetch(`/api/blogs?action=single&id=${blogId}`);
      const blog = await res.json();
      if (!blog) return { bookmark: null, error: { message: "블로그 정보를 찾을 수 없습니다." } };
      const payload = blogToPayload(blog);
      const response = await saveBookmarkToApp(payload);
      if (response.success) {
        return {
          bookmark: { id: payload.id, user_id: "flutter_app_user", blog_id: blogId, created_at: new Date().toISOString() },
          error: null,
        };
      }
      return { bookmark: null, error: { message: "북마크 저장에 실패했습니다." } };
    } catch {
      return { bookmark: null, error: { message: "북마크 저장에 실패했습니다." } };
    }
  }

  try {
    const res = await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blogId }),
    });

    const data = await res.json();
    if (!res.ok) return { bookmark: null, error: { message: data.error } };
    return { bookmark: data.bookmark, error: null };
  } catch {
    return { bookmark: null, error: { message: "북마크 추가 실패" } };
  }
}

// 북마크 제거
export async function removeBookmark(blogId: number): Promise<{ error: BookmarkError | null }> {
  if (isFlutterWebView()) {
    const response = await removeBookmarkFromApp(String(blogId));
    return response.success ? { error: null } : { error: { message: "북마크 제거에 실패했습니다." } };
  }

  try {
    const res = await fetch("/api/bookmarks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blogId }),
    });

    if (!res.ok) {
      const data = await res.json();
      return { error: { message: data.error } };
    }
    return { error: null };
  } catch {
    return { error: { message: "북마크 삭제 실패" } };
  }
}

// 북마크 상태 확인
export async function isBookmarked(blogId: number): Promise<boolean> {
  if (isFlutterWebView()) {
    const response = await checkBookmarkInApp(String(blogId));
    return response.isBookmarked;
  }

  try {
    const res = await fetch(`/api/bookmarks/check?blogId=${blogId}`);
    const data = await res.json();
    return data.isBookmarked;
  } catch {
    return false;
  }
}

// 사용자의 모든 북마크 가져오기
export async function getUserBookmarks(): Promise<BookmarkListResponse> {
  try {
    const res = await fetch("/api/bookmarks");
    const data = await res.json();
    if (!res.ok) return { bookmarks: [], error: { message: data.error } };
    return { bookmarks: data.bookmarks || [], error: null };
  } catch {
    return { bookmarks: [], error: { message: "북마크 조회 실패" } };
  }
}

// 북마크된 블로그 목록 가져오기 (블로그 정보 포함)
export async function getBookmarkedBlogs(): Promise<BookmarkedBlogsResponse> {
  try {
    const res = await fetch("/api/bookmarks?includeBlogs=true");
    const data = await res.json();
    if (!res.ok) return { blogs: [], error: { message: data.error } };
    return { blogs: data.blogs || [], error: null };
  } catch {
    return { blogs: [], error: { message: "북마크 조회 실패" } };
  }
}
