import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

type Params = Promise<{ id: string }>;

export async function PUT(req: Request, { params }: { params: Params }) {
  const { error } = await requireAuth("marketing");
  if (error) return error;

  const { id } = await params;
  const { name, triggerType, config } = await req.json();
  const workflow = await prisma.workflow.update({
    where: { id: Number(id) },
    data:  { name, triggerType, config },
  });
  return NextResponse.json(workflow);
}

export async function DELETE(_req: Request, { params }: { params: Params }) {
  const { error } = await requireAuth("marketing");
  if (error) return error;

  const { id } = await params;
  await prisma.workflow.delete({ where: { id: Number(id) } });
  return new NextResponse(null, { status: 204 });
}
