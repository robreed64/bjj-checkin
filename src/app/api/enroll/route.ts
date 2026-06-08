import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    name, email, phone, dateOfBirth, ageGroup, trainingType,
    planId, stripeCustomerId, paymentMethodId,
  } = body;

  if (!name?.trim() || !email?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: "Name, email, and phone are required" }, { status: 400 });
  }

  let resolvedCustomerId = stripeCustomerId ?? null;
  let stripeSubId: string | null = null;
  let memberStatus = planId ? "active" : "trial";

  const stripe = await getStripeClient();

  if (planId && stripe) {
    const plan = await prisma.membershipPlan.findUnique({ where: { id: parseInt(planId, 10) } });

    if (plan?.stripePriceId) {
      // Create customer if we somehow don't have one yet
      if (!resolvedCustomerId) {
        const customer = await stripe.customers.create({ name, email });
        resolvedCustomerId = customer.id;
      }

      // Attach payment method if provided
      if (paymentMethodId) {
        await stripe.paymentMethods.attach(paymentMethodId, { customer: resolvedCustomerId });
        await stripe.customers.update(resolvedCustomerId, {
          invoice_settings: { default_payment_method: paymentMethodId },
        });
      }

      const sub = await stripe.subscriptions.create({
        customer:         resolvedCustomerId,
        items:            [{ price: plan.stripePriceId }],
        payment_behavior: "default_incomplete",
        expand:           ["latest_invoice.payment_intent"],
      });

      stripeSubId  = sub.id;
      memberStatus = sub.status === "active" || sub.status === "trialing" ? "active" : "past_due";
    }
  }

  // Create the member record
  const member = await prisma.member.create({
    data: {
      name:            name.trim(),
      email:           email.trim(),
      phone:           phone.trim(),
      dateOfBirth:     dateOfBirth ? new Date(dateOfBirth) : null,
      ageGroup:        ageGroup  || "adult",
      trainingType:    trainingType || null,
      beltRank:        "white",
      status:          memberStatus,
      stripeCustomerId: resolvedCustomerId,
      waiverSignedAt:  new Date(),
    },
  });

  // Update Stripe customer with the new member's DB id in metadata
  if (resolvedCustomerId && stripe) {
    await stripe.customers.update(resolvedCustomerId, { metadata: { memberId: String(member.id) } }).catch(() => {});
  }

  // Create subscription record
  if (planId) {
    await prisma.subscription.create({
      data: {
        memberId:             member.id,
        planId:               parseInt(planId, 10),
        stripeSubscriptionId: stripeSubId,
        status:               memberStatus,
        startDate:            new Date(),
      },
    });
  }

  return NextResponse.json({ success: true, memberId: member.id });
}
