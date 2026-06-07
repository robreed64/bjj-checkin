import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) return NextResponse.json([]);

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
    },
    take: 8,
    orderBy: { name: "asc" },
  });

  return NextResponse.json(members);
}
