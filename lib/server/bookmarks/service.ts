import type {
  Bookmark,
  BookmarkIdsPage,
  BookmarkPage,
} from "@/lib/types/bookmarks";
import { BookmarkApiError } from "./errors";
import type { BookmarkRepository } from "./repository";
import type { BookmarkPagination } from "./validation";

export class BookmarkService {
  constructor(private readonly repository: BookmarkRepository) {}

  async list(pagination: BookmarkPagination): Promise<BookmarkPage> {
    const rows = await this.repository.list(pagination);
    const blogs = rows.flatMap((row) =>
      row.blog
        ? [
            {
              ...row.blog,
              bookmark_id: row.id,
              bookmark_created_at: row.created_at,
            },
          ]
        : [],
    );
    // 조인으로 숨겨진 글과 DB의 행 수 제한을 고려해 실제 받은 원본 행 수로 이동한다.
    return {
      blogs,
      nextOffset: rows.length ? pagination.offset + rows.length : null,
    };
  }

  async listIds(pagination: BookmarkPagination): Promise<BookmarkIdsPage> {
    const ids = await this.repository.listIds(pagination);
    return {
      ids,
      nextOffset: ids.length ? pagination.offset + ids.length : null,
    };
  }

  async save(blogId: number): Promise<Bookmark> {
    if (!(await this.repository.blogExists(blogId))) {
      throw new BookmarkApiError(
        404,
        "BLOG_NOT_FOUND",
        "블로그 글을 찾을 수 없습니다.",
      );
    }
    return this.repository.insertOrRead(blogId);
  }

  async remove(blogId: number): Promise<void> {
    await this.repository.delete(blogId);
  }
}
