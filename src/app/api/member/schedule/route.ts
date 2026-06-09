import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/require-member";

export async function GET() {
  const auth = await requireMember();
  if (auth.error) return auth.error;
  const { memberId } = auth;

  const now = new Date();
  const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const classes = await prisma.class.findMany({
    where: { startTime: { gte: now, lte: twoWeeksOut } },
    include: {
      program: { select: { name: true, type: true } },
      bookings: { where: { memberId }, select: { id: true, status: true } },
    },
    orderBy: { startTime: "asc" },
  });

  const result = classes.map((cls) => {
    const active = cls.bookings.find((b) => b.status === "booked" || b.status === "attended");
    return {
      id: cls.id,
      name: cls.name,
      instructorName: cls.instructorName,
      startTime: cls.startTime.toISOString(),
      endTime: cls.endTime.toISOString(),
      capacity: cls.capacity,
      program: cls.program,
      booking: active ?? null,
    };
  });

  return NextResponse.json(result);
}
