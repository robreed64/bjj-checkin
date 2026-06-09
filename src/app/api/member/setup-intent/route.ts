import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/require-member";
import { getStripeClient } from "@/lib/stripe";

export async function POST() {
  const auth = await requireMember();
  if (auth.error) return auth.error;
  const { memberId } = auth;

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { stripeCustomerId: true },
  });
  if (!member?.stripeCustomerId) {
    return NextResponse.json({ error: "No Stripe customer on file" }, { status: 400 });
  }

  const stripe = await getStripeClient();
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

  const intent = await stripe.setupIntents.create({
    customer: member.stripeCustomerId,
    payment_method_types: ["card"],
  });

  return NextResponse.json({ clientSecret: intent.client_secret });
}
