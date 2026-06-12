import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { can } from "@/lib/permissions";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

  // Endpoint is public for the kiosk; only staff sessions get stripeCustomerId
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isStaff = can(role, "pos");

  const members = await prisma.member.findMany({
    where: {
      name: { contains: q, mode: "insensitive" },
      status: { not: "canceled" },
    },
    select: {
      id: true,
      name: true,
      beltRank: true,
      ageGroup: true,
      status: true,
      photoUrl: true,
      trainingType: true,
      ...(isStaff ? { stripeCustomerId: true } : {}),
    },
    take: 8,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(members);
}
