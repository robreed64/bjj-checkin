import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const classId = parseInt(id, 10);
  const body    = await req.json();

  const cls = await prisma.class.update({
    where: { id: classId },
    data: {
      name:           body.name,
      startTime:      body.startTime ? new Date(body.startTime) : undefined,
      endTime:        body.endTime   ? new Date(body.endTime)   : undefined,
      instructorName: body.instructorName ?? undefined,
      capacity:       body.capacity !== undefined ? (body.capacity ? parseInt(body.capacity, 10) : null) : undefined,
      recurrenceRule: body.recurrenceRule ?? undefined,
      programId:      body.programId ? parseInt(body.programId, 10) : undefined,
    },
    include: { program: true },
  });

  return NextResponse.json(cls);
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const classId = parseInt(id, 10);

  await prisma.attendance.deleteMany({ where: { classId } });
  await prisma.booking.deleteMany({ where: { classId } });
  await prisma.class.delete({ where: { id: classId } });

  return NextResponse.json({ success: true });
}
