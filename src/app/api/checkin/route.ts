import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { memberId, classId } = await req.json();
  if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });

  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
  if (member.status === "canceled") return NextResponse.json({ error: "Membership canceled" }, { status: 403 });

  const record = await prisma.attendance.create({
    data: { memberId, classId: classId ?? null, source: "kiosk" },
  });

  // Upsert a booking record if checking into a specific class
  if (classId) {
    const existing = await prisma.booking.findFirst({ where: { memberId, classId } });
    if (existing) {
      await prisma.booking.update({ where: { id: existing.id }, data: { status: "attended" } });
    } else {
      await prisma.booking.create({ data: { memberId, classId, status: "attended" } });
    }
  }

  return NextResponse.json({ success: true, attendanceId: record.id });
}
