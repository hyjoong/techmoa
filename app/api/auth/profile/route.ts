import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  try {
    const profile = await prisma.userProfile.findUnique({
      where: { id: userId },
    });

    if (!profile) {
      return NextResponse.json(null);
    }

    return NextResponse.json({
      id: profile.id,
      email: "",
      username: profile.username,
      avatar_url: profile.avatar_url,
      preferences: profile.preferences,
      created_at: profile.created_at?.toISOString(),
      updated_at: profile.updated_at?.toISOString(),
    });
  } catch {
    return NextResponse.json(null);
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await request.json();
    const profile = await prisma.userProfile.upsert({
      where: { id: session.user.id },
      update: {
        username: data.username,
        avatar_url: data.avatar_url,
        preferences: data.preferences,
        updated_at: new Date(),
      },
      create: {
        id: session.user.id,
        username: data.username || session.user.name,
        avatar_url: data.avatar_url,
        preferences: data.preferences,
      },
    });

    return NextResponse.json({
      id: profile.id,
      username: profile.username,
      avatar_url: profile.avatar_url,
      preferences: profile.preferences,
      created_at: profile.created_at?.toISOString(),
      updated_at: profile.updated_at?.toISOString(),
    });
  } catch (error) {
    return NextResponse.json({ error: "Profile update failed" }, { status: 500 });
  }
}
