import { NextRequest, NextResponse } from "next/server";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  if (!stripeConfigured || !stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const { name, email, memberId } = await req.json();

  let stripeCustomerId: string | null = null;

  // Re-use existing customer if member already has one
  if (memberId) {
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    stripeCustomerId = member?.stripeCustomerId ?? null;
  }

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({ name, email: email || undefined });
    stripeCustomerId = customer.id;
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: stripeCustomerId,
    payment_method_types: ["card"],
  });

  return NextResponse.json({
    clientSecret: setupIntent.client_secret,
    customerId: stripeCustomerId,
  });
}
