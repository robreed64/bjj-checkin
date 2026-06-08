import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function GET() {
  const reqs = await prisma.beltRequirement.findMany({
    orderBy: { id: "asc" },
  });
  return NextResponse.json(reqs);
}

export async function PUT(req: Request) {
  const { error } = await requireAuth("belts");
  if (error) return error;

  const body: { id?: number; beltRank: string; minClasses: number; minMonths: number; minTechniques: number }[] =
    await req.json();

  const results = await Promise.all(
    body.map((r) =>
      r.id
        ? prisma.beltRequirement.update({
            where: { id: r.id },
            data: { minClasses: r.minClasses, minMonths: r.minMonths, minTechniques: r.minTechniques },
          })
        : prisma.beltRequirement.create({
            data: { beltRank: r.beltRank, minClasses: r.minClasses, minMonths: r.minMonths, minTechniques: r.minTechniques },
          })
    )
  );

  return NextResponse.json(results);
}
