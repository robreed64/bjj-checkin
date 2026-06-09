import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

type Params = Promise<{ id: string }>;

export async function GET(_req: Request, { params }: { params: Params }) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (isNaN(memberId)) return NextResponse.json({ error: "Invalid member" }, { status: 400 });

  const member = await prisma.member.findUnique({ where: { id: memberId }, select: { checkinToken: true } });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let token = member.checkinToken;
  if (!token) {
    token = crypto.randomUUID();
    await prisma.member.update({ where: { id: memberId }, data: { checkinToken: token } });
  }

  return NextResponse.json({ token });
}
