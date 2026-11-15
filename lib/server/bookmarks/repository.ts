import type { SupabaseClient } from "@supabase/supabase-js";
import type { Blog } from "@/lib/supabase";
import type { Bookmark } from "@/lib/types/bookmarks";
import type { BookmarkPagination } from "./validation";
import { databaseError } from "./errors";

export type BookmarkBlogRow = Pick<Bookmark, "id" | "created_at"> & {
  blog: Blog | null;
};

export class BookmarkRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly userId: string,
  ) {}

  async list({
    offset,
    limit,
  }: BookmarkPagination): Promise<BookmarkBlogRow[]> {
    const { data, error } = await this.client
      .from("bookmarks")
      .select("id, created_at, blog:blogs(*)")
      .eq("user_id", this.userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1)
      .returns<BookmarkBlogRow[]>();
    if (error || !data) throw databaseError();
    return data;
  }

  async listIds({ offset, limit }: BookmarkPagination): Promise<number[]> {
    const { data, error } = await this.client
      .from("bookmarks")
      .select("blog_id")
      .eq("user_id", this.userId)
      .order("id", { ascending: true })
      .range(offset, offset + limit - 1)
      .returns<Pick<Bookmark, "blog_id">[]>();
    if (error || !data) throw databaseError();
    return data.map((bookmark) => bookmark.blog_id);
  }

  async blogExists(blogId: number): Promise<boolean> {
    const { data, error } = await this.client
      .from("blogs")
      .select("id")
      .eq("id", blogId)
      .maybeSingle<{ id: number }>();
    if (error) throw databaseError();
    return data !== null;
  }

  async insertOrRead(blogId: number): Promise<Bookmark> {
    const { data, error } = await this.client
      .from("bookmarks")
      .insert({ user_id: this.userId, blog_id: blogId })
      .select("id, user_id, blog_id, created_at")
      .single<Bookmark>();
    if (!error && data) return data;
    if (error?.code !== "23505") throw databaseError();

    // UNIQUE(user_id, blog_id)가 동시 저장을 막고, 재조회는 기존 저장 시각을 보존한다.
    const existing = await this.client
      .from("bookmarks")
      .select("id, user_id, blog_id, created_at")
      .eq("user_id", this.userId)
      .eq("blog_id", blogId)
      .maybeSingle<Bookmark>();
    if (existing.error || !existing.data) throw databaseError();
    return existing.data;
  }

  async delete(blogId: number): Promise<void> {
    const { error } = await this.client
      .from("bookmarks")
      .delete()
      .eq("user_id", this.userId)
      .eq("blog_id", blogId);
    if (error) throw databaseError();
  }
}
