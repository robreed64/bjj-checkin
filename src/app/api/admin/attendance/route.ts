import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function POST(req: Request) {
  const { error } = await requireAuth("members");
  if (error) return error;

  const { memberId, classId, timestamp } = await req.json();
  if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 });

  const record = await prisma.attendance.create({
    data: {
      memberId: parseInt(memberId, 10),
      classId:  classId ? parseInt(classId, 10) : null,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      source:   "staff",
    },
  });

  return NextResponse.json(record, { status: 201 });
}
