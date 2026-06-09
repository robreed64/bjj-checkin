import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/require-member";
import { getStripeClient } from "@/lib/stripe";

export async function GET() {
  const auth = await requireMember();
  if (auth.error) return auth.error;
  const { memberId } = auth;

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { stripeCustomerId: true },
  });
  if (!member?.stripeCustomerId) return NextResponse.json({ card: null });

  const stripe = await getStripeClient();
  if (!stripe) return NextResponse.json({ card: null });

  try {
    const customer = await stripe.customers.retrieve(member.stripeCustomerId, {
      expand: ["invoice_settings.default_payment_method"],
    });
    if ("deleted" in customer) return NextResponse.json({ card: null });
    const pm = customer.invoice_settings?.default_payment_method;
    if (!pm || typeof pm === "string") return NextResponse.json({ card: null });
    return NextResponse.json({
      card: { brand: pm.card?.brand ?? null, last4: pm.card?.last4 ?? null },
    });
  } catch {
    return NextResponse.json({ card: null });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireMember();
  if (auth.error) return auth.error;
  const { memberId } = auth;

  const { paymentMethodId } = await req.json();
  if (!paymentMethodId) {
    return NextResponse.json({ error: "paymentMethodId required" }, { status: 400 });
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { stripeCustomerId: true },
  });
  if (!member?.stripeCustomerId) {
    return NextResponse.json({ error: "No Stripe customer on file" }, { status: 400 });
  }

  const stripe = await getStripeClient();
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

  await stripe.paymentMethods.attach(paymentMethodId, { customer: member.stripeCustomerId });
  await stripe.customers.update(member.stripeCustomerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  const subs = await prisma.subscription.findMany({
    where: { memberId, status: "active", stripeSubscriptionId: { not: null } },
  });
  for (const sub of subs) {
    await stripe.subscriptions
      .update(sub.stripeSubscriptionId!, { default_payment_method: paymentMethodId })
      .catch(() => {});
  }

  return NextResponse.json({ success: true });
}
