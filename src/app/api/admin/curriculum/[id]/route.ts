import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

type Params = Promise<{ id: string }>;

export async function GET(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const curriculum = await prisma.curriculum.findUnique({
    where:   { id: Number(id) },
    include: {
      lessons: { orderBy: [{ weekNumber: "asc" }, { position: "asc" }] },
    },
  });
  if (!curriculum) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(curriculum);
}

export async function PUT(req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const { name, description, beltLevel, weeks, active } = await req.json();
  const curriculum = await prisma.curriculum.update({
    where: { id: Number(id) },
    data:  {
      ...(name        !== undefined && { name }),
      ...(description !== undefined && { description: description || null }),
      ...(beltLevel   !== undefined && { beltLevel: beltLevel || null }),
      ...(weeks       !== undefined && { weeks: Number(weeks) }),
      ...(active      !== undefined && { active }),
    },
  });
  return NextResponse.json(curriculum);
}

export async function DELETE(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  await prisma.curriculum.delete({ where: { id: Number(id) } });
  return new NextResponse(null, { status: 204 });
}
