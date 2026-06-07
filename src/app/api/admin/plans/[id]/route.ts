import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe, stripeConfigured } from "@/lib/stripe";

type Params = Promise<{ id: string }>;

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const plan = await prisma.membershipPlan.findUnique({ where: { id: parseInt(id, 10) } });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(plan);
}

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const planId = parseInt(id, 10);
  const body = await req.json();

  const existing = await prisma.membershipPlan.findUnique({ where: { id: planId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Sync name/description to Stripe product if linked
  if (stripeConfigured && stripe && existing.stripePriceId) {
    try {
      const price   = await stripe.prices.retrieve(existing.stripePriceId);
      const product = typeof price.product === "string" ? price.product : price.product.id;
      await stripe.products.update(product, {
        name:        body.name        ?? existing.name,
        description: body.description ?? existing.description ?? undefined,
      });
    } catch { /* non-fatal */ }
  }

  const plan = await prisma.membershipPlan.update({
    where: { id: planId },
    data: {
      name:            body.name        ?? existing.name,
      description:     body.description ?? existing.description,
      planType:        body.planType    ?? existing.planType,
      classLimit:      body.classLimit  ?? existing.classLimit,
    },
  });

  return NextResponse.json(plan);
}

export async function DELETE(_req: NextRequest, { params }: { params: Params }) {
  const { id } = await params;
  const planId = parseInt(id, 10);

  const existing = await prisma.membershipPlan.findUnique({ where: { id: planId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Archive in Stripe rather than delete
  if (stripeConfigured && stripe && existing.stripePriceId) {
    try {
      await stripe.prices.update(existing.stripePriceId, { active: false });
    } catch { /* non-fatal */ }
  }

  await prisma.membershipPlan.delete({ where: { id: planId } });
  return NextResponse.json({ success: true });
}
