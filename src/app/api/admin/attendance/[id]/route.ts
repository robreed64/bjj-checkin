import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

type Params = Promise<{ id: string }>;

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { error } = await requireAuth("members");
  if (error) return error;

  const { id } = await params;
  const attendanceId = parseInt(id, 10);
  if (isNaN(attendanceId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  await prisma.attendance.delete({ where: { id: attendanceId } });
  return NextResponse.json({ success: true });
}
