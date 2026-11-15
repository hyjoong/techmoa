import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { BookmarkApiError, databaseError } from "./errors";

export type BookmarkSession = {
  client: SupabaseClient;
  userId: string;
};

export async function authenticateBookmarkRequest(
  request: Request,
): Promise<BookmarkSession> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) {
    throw new BookmarkApiError(401, "UNAUTHORIZED", "로그인이 필요합니다.");
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw databaseError();

  // 요청마다 사용자 토큰을 가진 클라이언트를 생성해 DB의 RLS도 적용한다.
  const client = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => fetch(input, { ...init, signal: request.signal }),
    },
  });

  let result: Awaited<ReturnType<typeof client.auth.getUser>>;
  try {
    result = await client.auth.getUser(token);
  } catch {
    throw databaseError();
  }
  if (result.error) {
    if (
      !result.error.status ||
      result.error.status >= 500 ||
      result.error.status === 429
    ) {
      throw databaseError();
    }
    throw new BookmarkApiError(401, "UNAUTHORIZED", "다시 로그인해 주세요.");
  }
  if (!result.data.user) {
    throw new BookmarkApiError(401, "UNAUTHORIZED", "다시 로그인해 주세요.");
  }
  return { client, userId: result.data.user.id };
}
