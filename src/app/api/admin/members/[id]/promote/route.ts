import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNextBelt } from "@/lib/belt-data";
import { requireAuth } from "@/lib/require-auth";

type Params = Promise<{ id: string }>;

export async function POST(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (isNaN(memberId)) return NextResponse.json({ error: "Invalid member" }, { status: 400 });

  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const nextBelt = getNextBelt(member.beltRank);
  if (!nextBelt) return NextResponse.json({ error: "Already at highest belt" }, { status: 400 });

  const updated = await prisma.member.update({
    where: { id: memberId },
    data: { beltRank: nextBelt },
  });

  return NextResponse.json({ beltRank: updated.beltRank });
}
