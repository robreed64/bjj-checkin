import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { milestoneFor } from "@/lib/milestones";

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

  // Everyone needs a waiver on file before training (enroll stamps it; trials,
  // imports, and day-pass walk-ins sign at the kiosk)
  if (!member.waiverSignedAt) {
    return NextResponse.json({
      waiverRequired: true,
      member: { id: member.id, name: member.name, beltRank: member.beltRank },
    });
  }

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

  const totalClasses = await prisma.attendance.count({ where: { memberId: member.id } });

  return NextResponse.json({
    success: true,
    attendanceId: record.id,
    totalClasses,
    milestone: milestoneFor(totalClasses),
    member: { name: member.name, beltRank: member.beltRank },
  });
}
