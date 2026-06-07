import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const sp        = req.nextUrl.searchParams;
  const weekStart = sp.get("weekStart");
  const weekEnd   = sp.get("weekEnd");

  const where = weekStart && weekEnd
    ? { startTime: { gte: new Date(weekStart), lt: new Date(weekEnd) } }
    : {};

  const classes = await prisma.class.findMany({
    where,
    include: { program: true },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json(classes);
}

export async function POST(req: NextRequest) {
  const { programId, name, startTime, endTime, instructorName, capacity, recurrenceRule } = await req.json();

  if (!name || !startTime || !endTime) {
    return NextResponse.json({ error: "name, startTime, and endTime are required" }, { status: 400 });
  }

  const baseData = {
    name,
    startTime:      new Date(startTime),
    endTime:        new Date(endTime),
    instructorName: instructorName || null,
    capacity:       capacity ? parseInt(capacity, 10) : null,
    recurrenceRule: recurrenceRule || null,
  };

  const cls = await prisma.class.create({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: programId ? { ...baseData, programId: parseInt(programId, 10) } as any : baseData,
    include: { program: true },
  });

  return NextResponse.json(cls, { status: 201 });
}
