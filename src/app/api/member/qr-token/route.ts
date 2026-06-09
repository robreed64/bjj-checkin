import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/require-member";

export async function GET() {
  const auth = await requireMember();
  if (auth.error) return auth.error;
  const { memberId } = auth;

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { checkinToken: true, name: true },
  });
  if (!member) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let token = member.checkinToken;
  if (!token) {
    token = crypto.randomUUID();
    await prisma.member.update({ where: { id: memberId }, data: { checkinToken: token } });
  }

  return NextResponse.json({ token, name: member.name });
}
