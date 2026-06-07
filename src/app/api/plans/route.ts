import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const plans = await prisma.membershipPlan.findMany({
    orderBy: { priceCents: "asc" },
  });
  return NextResponse.json(plans);
}
