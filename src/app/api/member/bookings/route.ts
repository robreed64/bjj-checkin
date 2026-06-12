import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/require-member";
import { countActiveBookings } from "@/lib/waitlist";

export async function POST(req: NextRequest) {
  const auth = await requireMember();
  if (auth.error) return auth.error;
  const { memberId } = auth;

  const { classId } = await req.json();
  if (!classId) return NextResponse.json({ error: "classId required" }, { status: 400 });

  const existing = await prisma.booking.findFirst({
    where: { memberId, classId, status: { in: ["booked", "attended", "waitlisted"] } },
  });
  if (existing) return NextResponse.json({ error: "Already booked" }, { status: 409 });

  const cls = await prisma.class.findUnique({ where: { id: classId }, select: { capacity: true } });
  if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

  // Note: count-then-create isn't atomic; under simultaneous bookings the class
  // can exceed capacity by one. Acceptable for v1.
  if (cls.capacity != null) {
    const active = await countActiveBookings(classId);
    if (active >= cls.capacity) {
      const booking = await prisma.booking.create({
        data: { memberId, classId, status: "waitlisted" },
      });
      const position = await prisma.booking.count({
        where: { classId, status: "waitlisted", createdAt: { lte: booking.createdAt } },
      });
      return NextResponse.json({ ...booking, waitlisted: true, position }, { status: 201 });
    }
  }

  const booking = await prisma.booking.create({
    data: { memberId, classId, status: "booked" },
  });
  return NextResponse.json(booking, { status: 201 });
}
