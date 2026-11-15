import type { Blog } from "../supabase";

export type Bookmark = {
  id: string;
  user_id: string;
  blog_id: number;
  created_at: string;
};

export type BookmarkedBlog = Blog & {
  bookmark_id: string;
  bookmark_created_at: string;
};

export type BookmarkError = {
  message: string;
  code?: string;
};

export type ApiError = {
  error: { message: string; code: string };
};

export type BookmarkPage = {
  blogs: BookmarkedBlog[];
  nextOffset: number | null;
};

export type BookmarkIdsPage = {
  ids: number[];
  nextOffset: number | null;
};

export type BookmarkResponse = {
  bookmark: Bookmark | null;
  error: BookmarkError | null;
};

export type BookmarkListResponse = {
  bookmarks: Pick<Bookmark, "blog_id">[];
  error: BookmarkError | null;
};

export type BookmarkedBlogsResponse = {
  blogs: BookmarkedBlog[];
  error: BookmarkError | null;
};
