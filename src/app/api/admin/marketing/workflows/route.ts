import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function GET() {
  const workflows = await prisma.workflow.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { messages: true } } },
  });
  return NextResponse.json(workflows);
}

export async function POST(req: Request) {
  const { error } = await requireAuth("marketing");
  if (error) return error;

  const { name, triggerType, config } = await req.json();
  const workflow = await prisma.workflow.create({
    data: { name, triggerType, config, active: true },
  });
  return NextResponse.json(workflow, { status: 201 });
}
