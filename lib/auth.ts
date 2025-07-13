import { supabase } from "./supabase";
import { User, Session, AuthError } from "@supabase/supabase-js";

// 사용자 프로필 타입
export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  avatar_url?: string;
  preferences?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// 로그인 함수
export async function signIn(
  email: string,
  password: string
): Promise<{
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return {
    user: data.user,
    session: data.session,
    error,
  };
}

// 회원가입 함수
export async function signUp(
  email: string,
  password: string
): Promise<{
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  return {
    user: data.user,
    session: data.session,
    error,
  };
}

// 로그아웃 함수
export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

// 현재 사용자 가져오기
export async function getCurrentUser(): Promise<User | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// 현재 세션 가져오기
export async function getCurrentSession(): Promise<Session | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

// 사용자 프로필 가져오기
export async function getUserProfile(
  userId: string
): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      // 프로필이 없는 경우 자동 생성 시도
      if (error.code === "PGRST116") {
        console.log("사용자 프로필이 없습니다. 자동 생성 시도...");
        const user = await getCurrentUser();
        if (user) {
          const { profile, error: createError } = await upsertUserProfile({
            id: userId,
            email: user.email || "",
            username: user.user_metadata?.username || user.email?.split("@")[0] || "user",
          });
          
          if (createError) {
            console.error("프로필 생성 실패:", createError);
            return null;
          }
          
          return profile;
        }
      }
      
      console.error("사용자 프로필 조회 실패:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("사용자 프로필 조회 중 예외 발생:", error);
    return null;
  }
}

// 사용자 프로필 생성/업데이트
export async function upsertUserProfile(
  profile: Partial<UserProfile>
): Promise<{
  profile: UserProfile | null;
  error: any;
}> {
  const { data, error } = await supabase
    .from("user_profiles")
    .upsert(profile)
    .select()
    .single();

  return {
    profile: data,
    error,
  };
}

// 소셜 로그인 (Google)
export async function signInWithGoogle(): Promise<{
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  return {
    user: null, // OAuth는 리다이렉트 방식이므로 즉시 사용자 정보를 얻을 수 없음
    session: null,
    error,
  };
}

// 소셜 로그인 (GitHub)
export async function signInWithGithub(): Promise<{
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}> {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  return {
    user: null, // OAuth는 리다이렉트 방식이므로 즉시 사용자 정보를 얻을 수 없음
    session: null,
    error,
  };
}

// 비밀번호 재설정
export async function resetPassword(
  email: string
): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  return { error };
}

// 인증 상태 변경 리스너
export function onAuthStateChange(callback: (user: User | null) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user ?? null);
  });
}
