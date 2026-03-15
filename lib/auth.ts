import { signIn as nextAuthSignIn, signOut as nextAuthSignOut } from "next-auth/react";

export type UserPreferences = Record<string, string | number | boolean | null>;

// 사용자 프로필 타입
export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  avatar_url?: string;
  preferences?: UserPreferences;
  created_at: string;
  updated_at: string;
}

// 이메일/비밀번호 로그인
export async function signIn(email: string, password: string) {
  const result = await nextAuthSignIn("credentials", {
    email,
    password,
    redirect: false,
  });

  if (result?.error) {
    return { user: null, session: null, error: { message: result.error } };
  }

  return { user: null, session: null, error: null };
}

// 회원가입
export async function signUp(email: string, password: string) {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    return { user: null, session: null, error: { message: data.error } };
  }

  // 가입 후 자동 로그인
  return signIn(email, password);
}

// 로그아웃
export async function signOut() {
  await nextAuthSignOut({ redirect: false });
  return { error: null };
}

// Google 소셜 로그인
export async function signInWithGoogle() {
  await nextAuthSignIn("google", { callbackUrl: "/" });
  return { user: null, session: null, error: null };
}

// GitHub 소셜 로그인
export async function signInWithGithub() {
  await nextAuthSignIn("github", { callbackUrl: "/" });
  return { user: null, session: null, error: null };
}

// 프로필 조회
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const res = await fetch(`/api/auth/profile?userId=${userId}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// 프로필 업데이트
export async function upsertUserProfile(profile: Partial<UserProfile>) {
  try {
    const res = await fetch("/api/auth/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });

    if (!res.ok) {
      const err = await res.json();
      return { profile: null, error: err };
    }

    const data = await res.json();
    return { profile: data, error: null };
  } catch (error: any) {
    return { profile: null, error: { message: error.message } };
  }
}
