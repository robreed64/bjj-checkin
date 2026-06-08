import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";

export async function GET() {
  const plans = await prisma.membershipPlan.findMany({ orderBy: { priceCents: "asc" } });
  return NextResponse.json(plans);
}

export async function POST(req: NextRequest) {
  const { name, description, priceCents, billingInterval, planType, classLimit } = await req.json();

  if (!name || !priceCents || !planType) {
    return NextResponse.json({ error: "name, priceCents, and planType are required" }, { status: 400 });
  }

  let stripePriceId: string | null = null;
  const stripe = await getStripeClient();

  if (stripe) {
    // Create Stripe Product + Price
    const product = await stripe.products.create({ name, description: description ?? undefined });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: priceCents,
      currency: "usd",
      recurring: { interval: billingInterval === "yearly" ? "year" : "month" },
    });
    stripePriceId = price.id;
  }

  const plan = await prisma.membershipPlan.create({
    data: { name, description, priceCents, billingInterval: billingInterval ?? "monthly", planType, classLimit: classLimit ?? null, stripePriceId },
  });

  return NextResponse.json(plan, { status: 201 });
}
