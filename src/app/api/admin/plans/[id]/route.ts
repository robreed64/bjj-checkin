import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
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

  const stripe = await getStripeClient();
  if (stripe && existing.stripePriceId) {
    try {
      const price   = await stripe.prices.retrieve(existing.stripePriceId);
      const product = typeof price.product === "string" ? price.product : price.product.id;
      await stripe.products.update(product, {
        name:        body.name        ?? existing.name,
        description: body.description ?? existing.description ?? undefined,
      });
    } catch { /* non-fatal */ }
  }

  // If price or interval changed and plan is Stripe-linked, archive old price + create new one
  let stripePriceId = existing.stripePriceId;
  if (stripe && existing.stripePriceId && (body.priceCents !== undefined || body.billingInterval !== undefined)) {
    try {
      await stripe.prices.update(existing.stripePriceId, { active: false });
      const newPrice = await stripe.prices.create({
        currency: "usd",
        unit_amount: body.priceCents ?? existing.priceCents,
        recurring: { interval: (body.billingInterval ?? existing.billingInterval) === "yearly" ? "year" : "month" },
        product: (await stripe.prices.retrieve(existing.stripePriceId)).product as string,
      });
      stripePriceId = newPrice.id;
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
      stripePriceId,
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

  const stripe = await getStripeClient();
  if (stripe && existing.stripePriceId) {
    try {
      await stripe.prices.update(existing.stripePriceId, { active: false });
    } catch { /* non-fatal */ }
  }

  await prisma.membershipPlan.delete({ where: { id: planId } });
  return NextResponse.json({ success: true });
}
