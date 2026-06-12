import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Unauthenticated by design (kiosk flow, same threat model as /api/checkin).
// The only possible action is stamping a not-yet-signed waiver.
export async function POST(req: NextRequest) {
  const { memberId, token } = await req.json();

  const member = token
    ? await prisma.member.findUnique({ where: { checkinToken: token } })
    : memberId
    ? await prisma.member.findUnique({ where: { id: Number(memberId) } })
    : null;

  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  if (member.waiverSignedAt) {
    return NextResponse.json({ success: true, alreadySigned: true });
  }

  await prisma.member.update({
    where: { id: member.id },
    data: { waiverSignedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
