import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payments/provider";
import { getGymSettings } from "@/lib/gym-settings";
import { requireAuth } from "@/lib/require-auth";

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const plan = await prisma.membershipPlan.findUnique({ where: { id: parseInt(id, 10) } });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(plan);
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { error } = await requireAuth("plans");
  if (error) return error;

  const { id } = await params;
  const planId = parseInt(id, 10);
  const body = await req.json();

  const existing = await prisma.membershipPlan.findUnique({ where: { id: planId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const provider = await getPaymentProvider();
  let providerRefs = {
    stripePriceId:         existing.stripePriceId,
    squareCatalogPlanId:   existing.squareCatalogPlanId,
    squarePlanVariationId: existing.squarePlanVariationId,
  };

  // Price/interval changes retire the old provider price and create a new one;
  // existing subscriptions stay on the old price
  if (provider) {
    const priceChanged = body.priceCents !== undefined || body.billingInterval !== undefined;
    const settings = await getGymSettings();
    try {
      const updated = await provider.updatePlan(
        providerRefs,
        {
          name:            body.name        ?? existing.name,
          description:     body.description ?? existing.description,
          priceCents:      body.priceCents  ?? existing.priceCents,
          billingInterval: body.billingInterval ?? existing.billingInterval,
          currency:        settings.currency,
        },
        { priceChanged }
      );
      providerRefs = { ...providerRefs, ...updated };
    } catch { /* non-fatal */ }
  }

  const plan = await prisma.membershipPlan.update({
    where: { id: planId },
    data: {
      name:            body.name            ?? existing.name,
      description:     body.description     ?? existing.description,
      planType:        body.planType        ?? existing.planType,
      classLimit:      body.classLimit      !== undefined ? body.classLimit : existing.classLimit,
      priceCents:      body.priceCents      ?? existing.priceCents,
      billingInterval: body.billingInterval ?? existing.billingInterval,
      ...providerRefs,
    },
  });

  return NextResponse.json(plan);
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { error } = await requireAuth("plans");
  if (error) return error;

  const { id } = await params;
  const planId = parseInt(id, 10);

  const existing = await prisma.membershipPlan.findUnique({ where: { id: planId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const provider = await getPaymentProvider();
  if (provider) {
    try {
      await provider.deactivatePlan(existing);
    } catch { /* non-fatal */ }
  }

  await prisma.membershipPlan.delete({ where: { id: planId } });
  return NextResponse.json({ success: true });
}
