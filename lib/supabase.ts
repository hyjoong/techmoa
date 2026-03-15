// 이 파일은 기존 호환성을 위해 db.ts를 re-export합니다.
// Supabase 의존성이 완전히 제거되었으므로 모든 import는 @/lib/db를 사용하세요.
export {
  type Blog,
  fetchAvailableBlogs,
  fetchBlogs,
  createBlog,
  updateBlog,
  deleteBlog,
  incrementViews,
  fetchWeeklyPopularBlogs,
} from "./db";
