import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

// Active-subscription counts per provider — shown when switching providers so
// staff know how many members keep billing on the old one.
export async function GET() {
  const { error } = await requireAuth("settings");
  if (error) return error;

  const [stripeActive, squareActive] = await Promise.all([
    prisma.subscription.count({ where: { status: "active", stripeSubscriptionId: { not: null } } }),
    prisma.subscription.count({ where: { status: "active", squareSubscriptionId: { not: null } } }),
  ]);

  return NextResponse.json({ stripeActive, squareActive });
}
