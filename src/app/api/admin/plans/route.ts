import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payments/provider";
import { getGymSettings } from "@/lib/gym-settings";
import { requireAuth } from "@/lib/require-auth";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const plans = await prisma.membershipPlan.findMany({ orderBy: { priceCents: "asc" } });
  return NextResponse.json(plans);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth("plans");
  if (error) return error;
  const { name, description, priceCents, billingInterval, planType, classLimit } = await req.json();

  if (!name || !priceCents || !planType) {
    return NextResponse.json({ error: "name, priceCents, and planType are required" }, { status: 400 });
  }

  let providerRefs = {};
  const provider = await getPaymentProvider();

  if (provider) {
    const settings = await getGymSettings();
    providerRefs = await provider.createPlan({
      name,
      description,
      priceCents,
      billingInterval: billingInterval ?? "monthly",
      currency: settings.currency,
    });
  }

  const plan = await prisma.membershipPlan.create({
    data: { name, description, priceCents, billingInterval: billingInterval ?? "monthly", planType, classLimit: classLimit ?? null, ...providerRefs },
  });

  return NextResponse.json(plan, { status: 201 });
}
