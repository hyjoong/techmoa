"use client";

import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import {
  getCurrentUser,
  getCurrentSession,
  getUserProfile,
  onAuthStateChange,
  UserProfile,
  upsertUserProfile,
} from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface AuthState {
  user: User | null;
  profile: UserProfile | null;
  session: any;
  loading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const { toast } = useToast();

  // 인증 상태 초기화
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const [user, session] = await Promise.all([
          getCurrentUser(),
          getCurrentSession(),
        ]);

        let profile = null;
        if (user) {
          profile = await getUserProfile(user.id);
        }

        setAuthState({
          user,
          profile,
          session,
          loading: false,
        });
        setIsInitialized(true);
      } catch (error) {
        console.error("인증 상태 초기화 실패:", error);
        setAuthState((prev) => ({ ...prev, loading: false }));
        setIsInitialized(true);
      }
    };

    initializeAuth();

    // 인증 상태 변경 리스너
    const {
      data: { subscription },
    } = onAuthStateChange(async (user) => {
      try {
        let profile = null;
        if (user) {
          profile = await getUserProfile(user.id);
        }

        setAuthState({
          user,
          profile,
          session: user ? await getCurrentSession() : null,
          loading: false,
        });

        // 초기화 완료 후에만 토스트 표시 (초기 로드 시 토스트 방지)
        if (isInitialized) {
          if (user) {
            toast({
              title: "로그인 성공",
              description: "환영합니다!",
            });
          } else {
            toast({
              title: "로그아웃",
              description: "안전하게 로그아웃되었습니다.",
            });
          }
        }
      } catch (error) {
        console.error("인증 상태 변경 처리 실패:", error);
      }
    });

    return () => subscription.unsubscribe();
  }, [toast]);

  // 프로필 업데이트
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!authState.user) return;

    try {
      const { profile, error } = await upsertUserProfile({
        id: authState.user!.id,
        ...updates,
      });

      if (error) throw error;

      setAuthState((prev) => ({ ...prev, profile }));
      toast({
        title: "프로필 업데이트",
        description: "프로필이 성공적으로 업데이트되었습니다.",
      });

      return profile;
    } catch (error) {
      console.error("프로필 업데이트 실패:", error);
      toast({
        title: "오류",
        description: "프로필 업데이트에 실패했습니다.",
        variant: "destructive",
      });
      throw error;
    }
  };

  return {
    ...authState,
    updateProfile,
    isAuthenticated: !!authState.user,
  };
}
