import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/require-member";
import { promoteWaitlist } from "@/lib/waitlist";

type Params = Promise<{ id: string }>;

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const auth = await requireMember();
  if (auth.error) return auth.error;
  const { memberId } = auth;

  const { id } = await params;
  const bookingId = parseInt(id, 10);
  if (isNaN(bookingId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (booking.memberId !== memberId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.booking.update({ where: { id: bookingId }, data: { status: "canceled" } });

  // A canceled seat may free a spot for the waitlist
  if (booking.status === "booked" || booking.status === "attended") {
    await promoteWaitlist(booking.classId).catch(() => {});
  }

  return new NextResponse(null, { status: 204 });
}
