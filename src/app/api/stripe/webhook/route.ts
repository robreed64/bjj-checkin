import { NextRequest, NextResponse } from "next/server";
import { getStripeClient, getStripeWebhookSecret } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const stripe = await getStripeClient();
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });

  const webhookSecret = await getStripeWebhookSecret();
  if (!webhookSecret) return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });

  const body      = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const subStatus: Record<string, string> = {
    active:             "active",
    past_due:           "past_due",
    canceled:           "canceled",
    unpaid:             "past_due",
    trialing:           "active",
    incomplete:         "past_due",
    incomplete_expired: "canceled",
    paused:             "inactive",
  };

  switch (event.type) {
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const newStatus = subStatus[sub.status] ?? "inactive";
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { status: newStatus, updatedAt: new Date() },
      });
      const dbSub = await prisma.subscription.findFirst({ where: { stripeSubscriptionId: sub.id } });
      if (dbSub) {
        await prisma.member.update({
          where: { id: dbSub.memberId },
          data: { status: newStatus, updatedAt: new Date() },
        });
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (customerId) {
        await prisma.member.updateMany({ where: { stripeCustomerId: customerId }, data: { status: "past_due", updatedAt: new Date() } });
        await prisma.subscription.updateMany({ where: { member: { stripeCustomerId: customerId }, status: "active" }, data: { status: "past_due", updatedAt: new Date() } });
      }
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (customerId) {
        await prisma.member.updateMany({ where: { stripeCustomerId: customerId, status: "past_due" }, data: { status: "active", updatedAt: new Date() } });
        await prisma.subscription.updateMany({ where: { member: { stripeCustomerId: customerId }, status: "past_due" }, data: { status: "active", updatedAt: new Date() } });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
