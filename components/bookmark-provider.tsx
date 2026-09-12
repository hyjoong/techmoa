"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  type PropsWithChildren,
} from "react";
import { useAuth } from "@/hooks/use-auth";
import { getUserBookmarks } from "@/lib/bookmarks";
import { isFlutterWebView } from "@/lib/webview-bridge";

type BookmarkState = { userId: string; ids: Set<number> };
interface BookmarkContextValue {
  ids: Set<number>;
  loading: boolean;
  error: string | null;
  retry: () => void;
  setBookmarked: (id: number, bookmarked: boolean) => void;
}

const EMPTY_IDS = new Set<number>();
const BookmarkContext = createContext<BookmarkContextValue | null>(null);

export function BookmarkProvider({ children }: PropsWithChildren) {
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const activeUserRef = useRef(userId);
  const [state, setState] = useState<BookmarkState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    activeUserRef.current = userId;
    setState(null);
    setError(null);
    if (!userId || isFlutterWebView()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void getUserBookmarks()
      .then(({ bookmarks, error: bookmarkError }) => {
        if (!active) return;
        if (bookmarkError) throw new Error(bookmarkError.message);
        setState({
          userId,
          ids: new Set(bookmarks.map((bookmark) => bookmark.blog_id)),
        });
      })
      .catch(() => {
        if (active) setError("북마크 상태를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [userId, retryCount]);

  const setBookmarked = (id: number, bookmarked: boolean): void => {
    if (!userId || activeUserRef.current !== userId) return;
    setState((previous) => {
      const ids = new Set(previous?.userId === userId ? previous.ids : []);
      if (bookmarked) ids.add(id);
      else ids.delete(id);
      return { userId, ids };
    });
  };

  return (
    <BookmarkContext.Provider
      value={{
        ids: state && state.userId === userId ? state.ids : EMPTY_IDS,
        loading:
          authLoading ||
          loading ||
          (!!userId && !state && !error && !isFlutterWebView()),
        error,
        retry: () => setRetryCount((value) => value + 1),
        setBookmarked,
      }}
    >
      {children}
    </BookmarkContext.Provider>
  );
}

export function useBookmarks(): BookmarkContextValue {
  const bookmarks = useContext(BookmarkContext);
  if (!bookmarks)
    throw new Error("BookmarkProvider 안에서 북마크 상태를 사용해야 합니다.");
  return bookmarks;
}
