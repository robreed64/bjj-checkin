import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/require-member";

export async function POST(req: NextRequest) {
  const auth = await requireMember();
  if (auth.error) return auth.error;
  const { memberId } = auth;

  const { classId } = await req.json();
  if (!classId) return NextResponse.json({ error: "classId required" }, { status: 400 });

  const existing = await prisma.booking.findFirst({
    where: { memberId, classId, status: { in: ["booked", "attended"] } },
  });
  if (existing) return NextResponse.json({ error: "Already booked" }, { status: 409 });

  const booking = await prisma.booking.create({
    data: { memberId, classId, status: "booked" },
  });
  return NextResponse.json(booking, { status: 201 });
}
