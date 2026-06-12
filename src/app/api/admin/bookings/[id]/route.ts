import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { promoteWaitlist } from "@/lib/waitlist";

type Params = Promise<{ id: string }>;

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { error } = await requireAuth("schedule");
  if (error) return error;

  const { id } = await params;
  const bookingId = parseInt(id, 10);
  const { status } = await req.json();

  const booking = await prisma.booking.update({
    where: { id: bookingId },
    data: { status },
  });

  // Sync attendance record when marking attended/no_show
  if (status === "attended") {
    const already = await prisma.attendance.findFirst({
      where: { memberId: booking.memberId, classId: booking.classId ?? undefined },
    });
    if (!already && booking.classId) {
      await prisma.attendance.create({
        data: { memberId: booking.memberId, classId: booking.classId, source: "staff" },
      });
    }
  }

  if (status === "no_show" && booking.classId) {
    await prisma.attendance.deleteMany({
      where: { memberId: booking.memberId, classId: booking.classId },
    });
  }

  // Canceling frees a seat for the waitlist
  if (status === "canceled" && booking.classId) {
    await promoteWaitlist(booking.classId).catch(() => {});
  }

  return NextResponse.json(booking);
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { error } = await requireAuth("schedule");
  if (error) return error;

  const { id } = await params;
  const booking = await prisma.booking.delete({ where: { id: parseInt(id, 10) } });
  if ((booking.status === "booked" || booking.status === "attended") && booking.classId) {
    await promoteWaitlist(booking.classId).catch(() => {});
  }
  return NextResponse.json({ success: true });
}
