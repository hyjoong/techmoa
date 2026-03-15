import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ isBookmarked: false });
  }

  const blogId = request.nextUrl.searchParams.get("blogId");
  if (!blogId) {
    return NextResponse.json({ isBookmarked: false });
  }

  try {
    const bookmark = await prisma.bookmark.findFirst({
      where: {
        user_id: session.user.id,
        blog_id: parseInt(blogId),
      },
    });

    return NextResponse.json({ isBookmarked: !!bookmark });
  } catch (error) {
    return NextResponse.json({ isBookmarked: false });
  }
}
