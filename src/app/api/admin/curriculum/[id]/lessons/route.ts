import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

type Params = Promise<{ id: string }>;

export async function POST(req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const curriculumId = Number(id);
  const { title, weekNumber, dayOfWeek, warmup, techniques, notes, position } = await req.json();

  if (!title || !weekNumber) {
    return NextResponse.json({ error: "Title and week number are required" }, { status: 400 });
  }

  const lesson = await prisma.curriculumLesson.create({
    data: {
      curriculumId,
      title,
      weekNumber:  Number(weekNumber),
      dayOfWeek:   dayOfWeek || null,
      warmup:      warmup    || null,
      techniques:  techniques ?? [],
      notes:       notes      || null,
      position:    position   ?? 0,
    },
  });
  return NextResponse.json(lesson, { status: 201 });
}
