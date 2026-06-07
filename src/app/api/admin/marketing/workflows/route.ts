import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const workflows = await prisma.workflow.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { messages: true } } },
  });
  return NextResponse.json(workflows);
}

export async function POST(req: Request) {
  const { name, triggerType, config } = await req.json();
  const workflow = await prisma.workflow.create({
    data: { name, triggerType, config, active: true },
  });
  return NextResponse.json(workflow, { status: 201 });
}
