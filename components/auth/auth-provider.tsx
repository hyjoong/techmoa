"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import {
  getUserProfile,
  upsertUserProfile,
  type UserProfile,
} from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

function useAuthState() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    let active = true;
    let receivedEvent = false;
    // 인증 이벤트 안에서는 추가 인증 요청을 기다리지 않는다.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      receivedEvent = true;
      if (active) {
        setSession(nextSession);
        setLoading(false);
      }
    });
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active && !receivedEvent) {
          setSession(data.session);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active && !receivedEvent) setLoading(false);
      });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const user = session?.user ?? null;
  const userId = user?.id;
  useEffect(() => {
    let active = true;
    setProfile(null);
    if (userId)
      void getUserProfile(userId).then((nextProfile) => {
        if (active) setProfile(nextProfile);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const updateProfile = async (
    updates: Partial<UserProfile>,
  ): Promise<UserProfile | undefined> => {
    if (!userId) return;
    const { profile: updatedProfile, error } = await upsertUserProfile({
      ...updates,
      id: userId,
    });
    if (error) {
      toast({
        title: "오류",
        description: "프로필 업데이트에 실패했습니다.",
        variant: "destructive",
      });
      throw error;
    }
    setProfile(updatedProfile);
    toast({
      title: "프로필 업데이트",
      description: "프로필이 성공적으로 업데이트되었습니다.",
    });
    return updatedProfile ?? undefined;
  };

  return {
    user,
    session,
    profile: profile?.id === userId ? profile : null,
    loading,
    isAuthenticated: !!user,
    updateProfile,
  };
}

const AuthContext = createContext<ReturnType<typeof useAuthState> | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const auth = useAuthState();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth)
    throw new Error("AuthProvider 안에서 인증 상태를 사용해야 합니다.");
  return auth;
}
