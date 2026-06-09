import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { memberId, classId, token } = await req.json();

  // Resolve member by QR token or raw id
  const member = token
    ? await prisma.member.findUnique({ where: { checkinToken: token } })
    : memberId
    ? await prisma.member.findUnique({ where: { id: Number(memberId) } })
    : null;

  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if (member.status === "canceled") return NextResponse.json({ error: "Membership canceled" }, { status: 403 });

  const record = await prisma.attendance.create({
    data: { memberId: member.id, classId: classId ?? null, source: "kiosk" },
  });

  if (classId) {
    const existing = await prisma.booking.findFirst({ where: { memberId: member.id, classId } });
    if (existing) {
      await prisma.booking.update({ where: { id: existing.id }, data: { status: "attended" } });
    } else {
      await prisma.booking.create({ data: { memberId: member.id, classId, status: "attended" } });
    }
  }

  return NextResponse.json({
    success: true,
    attendanceId: record.id,
    member: { name: member.name, beltRank: member.beltRank },
  });
}
