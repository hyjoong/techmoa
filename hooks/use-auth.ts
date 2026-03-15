"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  getUserProfile,
  upsertUserProfile,
  UserProfile,
} from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";

interface AuthState {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    user_metadata?: {
      avatar_url?: string;
      full_name?: string;
      username?: string;
    };
  } | null;
  profile: UserProfile | null;
  session: any;
  loading: boolean;
}

export function useAuth() {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const { toast } = useToast();

  const loading = status === "loading";

  // 세션 변경 시 프로필 로드
  useEffect(() => {
    const loadProfile = async () => {
      if (session?.user?.id) {
        setProfileLoading(true);
        try {
          const p = await getUserProfile(session.user.id);
          setProfile(p);
        } catch (error) {
          console.error("프로필 로드 실패:", error);
        } finally {
          setProfileLoading(false);
        }
      } else {
        setProfile(null);
      }
    };

    loadProfile();
  }, [session?.user?.id]);

  // 사용자 객체 구성 (기존 인터페이스 호환)
  const user = session?.user
    ? {
        id: (session.user as any).id,
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
        user_metadata: {
          avatar_url: session.user.image || undefined,
          full_name: session.user.name || undefined,
          username: profile?.username || session.user.name || undefined,
        },
      }
    : null;

  // 프로필 업데이트
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!session?.user) return;

    try {
      const { profile: updatedProfile, error } = await upsertUserProfile({
        id: (session.user as any).id,
        ...updates,
      });

      if (error) throw error;

      setProfile(updatedProfile);
      toast({
        title: "프로필 업데이트",
        description: "프로필이 성공적으로 업데이트되었습니다.",
      });

      return updatedProfile;
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
    user,
    profile,
    session,
    loading: loading || profileLoading,
    updateProfile,
    isAuthenticated: !!session?.user,
  };
}
