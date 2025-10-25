import { supabase } from "./supabase";
import type { Blog } from "./supabase";
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

// 북마크된 블로그 타입 (북마크 정보 + 블로그 정보)
export interface BookmarkedBlog extends Blog {
  bookmark_id: string;
  bookmark_created_at: string;
}


// 에러 타입 정의
export interface BookmarkError {
  message: string;
  code?: string;
}

// API 응답 타입들
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

  // 웹 브라우저 환경: Supabase 사용
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      bookmark: null,
      error: { message: "로그인이 필요합니다." },
    };
  }

  const { data, error } = await supabase
    .from("bookmarks")
    .insert([{ user_id: user.id, blog_id: blogId }])
    .select()
    .single();

  return {
    bookmark: data,
    error: error ? { message: error.message, code: error.code } : null,
  };
}

// 북마크 제거
export async function removeBookmark(
  blogId: number
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

  // 웹 브라우저 환경: Supabase 사용
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error: { message: "로그인이 필요합니다." },
    };
  }

  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("user_id", user.id)
    .eq("blog_id", blogId);

  return {
    error: error ? { message: error.message, code: error.code } : null,
  };
}

// 북마크 상태 확인
export async function isBookmarked(blogId: number): Promise<boolean> {
  // Flutter 웹뷰 환경: 앱으로 메시지 전송
  if (isFlutterWebView()) {
    const response = await checkBookmarkInApp(String(blogId));
    return response.isBookmarked;
  }

  // 웹 브라우저 환경: Supabase 사용
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return false;
  }

  const { data, error } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", user.id)
    .eq("blog_id", blogId)
    .single();

  return !error && !!data;
}

// 사용자의 모든 북마크 가져오기
export async function getUserBookmarks(): Promise<BookmarkListResponse> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      bookmarks: [],
      error: { message: "로그인이 필요합니다." },
    };
  }

  const { data, error } = await supabase
    .from("bookmarks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return {
    bookmarks: data || [],
    error: error ? { message: error.message, code: error.code } : null,
  };
}

// 북마크된 블로그 목록 가져오기 (블로그 정보 포함)
export async function getBookmarkedBlogs(): Promise<BookmarkedBlogsResponse> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      blogs: [],
      error: { message: "로그인이 필요합니다." },
    };
  }

  const { data, error } = await supabase
    .from("bookmarks")
    .select(
      `
      id,
      created_at,
      blogs (*)
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return {
      blogs: [],
      error: { message: error.message, code: error.code },
    };
  }

  // 북마크 정보와 블로그 정보를 합쳐서 반환
  const bookmarkedBlogs = (data || [])
    .map((item) => {
      const blog = item.blogs as unknown as Blog;
      return {
        ...blog,
        bookmark_id: item.id,
        bookmark_created_at: item.created_at,
      };
    })
    .filter((blog) => blog !== null);

  return {
    blogs: bookmarkedBlogs as BookmarkedBlog[],
    error: null,
  };
}
