import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

type Params = Promise<{ id: string }>;

export async function POST(_req: Request, { params }: { params: Params }) {
  const { error } = await requireAuth("marketing");
  if (error) return error;

  const { id } = await params;
  const workflow = await prisma.workflow.findUnique({ where: { id: Number(id) } });
  if (!workflow) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.workflow.update({
    where: { id: Number(id) },
    data:  { active: !workflow.active },
  });
  return NextResponse.json(updated);
}
