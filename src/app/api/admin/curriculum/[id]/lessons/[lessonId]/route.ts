import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

type Params = Promise<{ id: string; lessonId: string }>;

export async function PUT(req: Request, { params }: { params: Params }) {
  const { error } = await requireAuth("curriculum");
  if (error) return error;

  const { lessonId } = await params;
  const { title, weekNumber, dayOfWeek, warmup, techniques, notes, position } = await req.json();

  const lesson = await prisma.curriculumLesson.update({
    where: { id: Number(lessonId) },
    data:  {
      ...(title      !== undefined && { title }),
      ...(weekNumber !== undefined && { weekNumber: Number(weekNumber) }),
      ...(dayOfWeek  !== undefined && { dayOfWeek: dayOfWeek || null }),
      ...(warmup     !== undefined && { warmup: warmup || null }),
      ...(techniques !== undefined && { techniques }),
      ...(notes      !== undefined && { notes: notes || null }),
      ...(position   !== undefined && { position }),
    },
  });
  return NextResponse.json(lesson);
}

export async function DELETE(_req: Request, { params }: { params: Params }) {
  const { error } = await requireAuth("curriculum");
  if (error) return error;

  const { lessonId } = await params;
  await prisma.curriculumLesson.delete({ where: { id: Number(lessonId) } });
  return new NextResponse(null, { status: 204 });
}
