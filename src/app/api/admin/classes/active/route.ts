import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Returns classes that started within the last 30 min and haven't ended yet
export async function GET() {
  const now     = new Date();
  const window  = new Date(now.getTime() - 30 * 60 * 1000);

  const classes = await prisma.class.findMany({
    where: { startTime: { gte: window }, endTime: { gt: now } },
    include: { program: true },
    orderBy: { startTime: "asc" },
  });

  return NextResponse.json(classes.map((c) => ({
    ...c,
    startTime: c.startTime.toISOString(),
    endTime:   c.endTime.toISOString(),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  })));
}
