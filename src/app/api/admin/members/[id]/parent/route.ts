import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

type Params = Promise<{ id: string }>;

export async function PATCH(req: Request, { params }: { params: Params }) {
  const { error } = await requireAuth("members");
  if (error) return error;

  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (isNaN(memberId)) return NextResponse.json({ error: "Invalid member" }, { status: 400 });

  const { parentId }: { parentId: number | null } = await req.json();

  // Prevent self-reference
  if (parentId === memberId) return NextResponse.json({ error: "Cannot link member to themselves" }, { status: 400 });

  const updated = await prisma.member.update({
    where: { id: memberId },
    data:  { parentId },
  });

  return NextResponse.json(updated);
}
