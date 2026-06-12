import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { runWorkflow } from "@/lib/marketing-triggers";

export async function POST(req: Request) {
  const { error } = await requireAuth("marketing");
  if (error) return error;

  const { workflowId } = await req.json();

  const workflow = await prisma.workflow.findUnique({ where: { id: Number(workflowId) } });
  if (!workflow || !workflow.active) {
    return NextResponse.json({ error: "Workflow not found or inactive" }, { status: 400 });
  }

  return NextResponse.json(await runWorkflow(workflow));
}
