import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const classId = parseInt(id, 10);

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      program: true,
      bookings: {
        include: { member: { select: { id: true, name: true, beltRank: true, photoUrl: true, status: true } } },
        orderBy: { createdAt: "asc" },
      },
      attendance: {
        include: { member: { select: { id: true, name: true, beltRank: true, photoUrl: true, status: true } } },
        orderBy: { timestamp: "asc" },
      },
    },
  });

  if (!cls) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(cls);
}

// Add member to roster (creates booking + optionally marks attended)
export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const classId  = parseInt(id, 10);
  const { memberId, markAttended } = await req.json();

  if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });

  // Upsert booking
  const existing = await prisma.booking.findFirst({ where: { memberId, classId } });

  const booking = existing
    ? await prisma.booking.update({ where: { id: existing.id }, data: { status: markAttended ? "attended" : "booked" } })
    : await prisma.booking.create({ data: { memberId, classId, status: markAttended ? "attended" : "booked" } });

  // Create attendance record if marking attended and not already present
  if (markAttended) {
    const alreadyCheckedIn = await prisma.attendance.findFirst({ where: { memberId, classId } });
    if (!alreadyCheckedIn) {
      await prisma.attendance.create({ data: { memberId, classId, source: "staff" } });
    }
  }

  return NextResponse.json(booking);
}
