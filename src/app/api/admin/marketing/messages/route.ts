import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function GET(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const memberId   = searchParams.get("memberId");
  const channel    = searchParams.get("channel");
  const workflowId = searchParams.get("workflowId");

  const messages = await prisma.message.findMany({
    where: {
      ...(memberId   ? { memberId:   Number(memberId)   } : {}),
      ...(channel    ? { channel                        } : {}),
      ...(workflowId ? { workflowId: Number(workflowId) } : {}),
    },
    orderBy: { sentAt: "desc" },
    take: 100,
    include: {
      member:   { select: { id: true, name: true } },
      workflow: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(messages);
}

export async function POST(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { memberId, channel, subject, body, workflowId } = await req.json();

  const message = await prisma.message.create({
    data: {
      memberId:   Number(memberId),
      channel,
      subject:    subject ?? null,
      body,
      sentAt:     new Date(),
      workflowId: workflowId ?? null,
    },
    include: {
      member:   { select: { id: true, name: true } },
      workflow: { select: { id: true, name: true } },
    },
  });
  return NextResponse.json(message, { status: 201 });
}
