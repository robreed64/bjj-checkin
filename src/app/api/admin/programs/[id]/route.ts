import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

type Params = Promise<{ id: string }>;

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { error } = await requireAuth("schedule");
  if (error) return error;

  const { id } = await params;
  const programId = parseInt(id, 10);
  if (isNaN(programId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const { name, type, description } = await req.json();
  const program = await prisma.program.update({
    where: { id: programId },
    data: {
      ...(name        && { name }),
      ...(type        && { type }),
      ...(description !== undefined && { description }),
    },
  });
  return NextResponse.json(program);
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { error } = await requireAuth("schedule");
  if (error) return error;

  const { id } = await params;
  const programId = parseInt(id, 10);
  if (isNaN(programId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const classCount = await prisma.class.count({ where: { programId } });
  if (classCount > 0) {
    return NextResponse.json(
      { error: `Cannot delete: ${classCount} class(es) use this program. Reassign or delete them first.` },
      { status: 409 }
    );
  }

  await prisma.program.delete({ where: { id: programId } });
  return NextResponse.json({ success: true });
}
