import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

// 북마크 목록 조회
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const includeBlogs = request.nextUrl.searchParams.get("includeBlogs") === "true";

  try {
    if (includeBlogs) {
      const bookmarks = await prisma.bookmark.findMany({
        where: { user_id: session.user.id },
        include: { blog: true },
        orderBy: { created_at: "desc" },
      });

      const blogs = bookmarks.map((b) => ({
        ...b.blog,
        published_at: b.blog.published_at?.toISOString(),
        created_at: b.blog.created_at?.toISOString(),
        updated_at: b.blog.updated_at?.toISOString(),
        bookmark_id: b.id,
        bookmark_created_at: b.created_at.toISOString(),
      }));

      return NextResponse.json({ blogs, error: null });
    }

    const bookmarks = await prisma.bookmark.findMany({
      where: { user_id: session.user.id },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({
      bookmarks: bookmarks.map((b) => ({
        ...b,
        created_at: b.created_at.toISOString(),
      })),
      error: null,
    });
  } catch (error) {
    return NextResponse.json({ error: "북마크 조회 실패" }, { status: 500 });
  }
}

// 북마크 추가
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const { blogId } = await request.json();

    const bookmark = await prisma.bookmark.create({
      data: {
        user_id: session.user.id,
        blog_id: blogId,
      },
    });

    return NextResponse.json({
      bookmark: {
        ...bookmark,
        created_at: bookmark.created_at.toISOString(),
      },
      error: null,
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "이미 북마크된 글입니다." }, { status: 409 });
    }
    return NextResponse.json({ error: "북마크 추가 실패" }, { status: 500 });
  }
}

// 북마크 삭제
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const { blogId } = await request.json();

    await prisma.bookmark.deleteMany({
      where: {
        user_id: session.user.id,
        blog_id: blogId,
      },
    });

    return NextResponse.json({ error: null });
  } catch (error) {
    return NextResponse.json({ error: "북마크 삭제 실패" }, { status: 500 });
  }
}
