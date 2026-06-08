import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

type Params = Promise<{ id: string }>;

export async function PATCH(req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (isNaN(memberId)) return NextResponse.json({ error: "Invalid member" }, { status: 400 });

  const { beltRank, techniqueName, mastered }: { beltRank: string; techniqueName: string; mastered: boolean } =
    await req.json();

  const record = await prisma.techniqueProgress.upsert({
    where: { memberId_beltRank_techniqueName: { memberId, beltRank, techniqueName } },
    update: { mastered },
    create: { memberId, beltRank, techniqueName, mastered },
  });

  return NextResponse.json(record);
}
