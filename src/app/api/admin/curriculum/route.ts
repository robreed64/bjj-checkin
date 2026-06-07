import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const curricula = await prisma.curriculum.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { lessons: true } } },
  });
  return NextResponse.json(curricula);
}

export async function POST(req: Request) {
  const { name, description, beltLevel, weeks } = await req.json();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const curriculum = await prisma.curriculum.create({
    data: {
      name,
      description: description ?? null,
      beltLevel:   beltLevel || null,
      weeks:       weeks ? Number(weeks) : 12,
    },
  });
  return NextResponse.json(curriculum, { status: 201 });
}
