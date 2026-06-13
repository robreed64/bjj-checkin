import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { getGymSettings } from "@/lib/gym-settings";
import { getProviderByName } from "@/lib/payments/provider";
import type { Subscription } from "@prisma/client";

// A member can hold a legacy subscription from the previously selected
// provider, so the discount is applied via the subscription's own provider —
// not whichever one is currently active.
function subscriptionProviderRef(sub: Subscription): { name: "stripe" | "square"; ref: string } | null {
  if (sub.squareSubscriptionId) return { name: "square", ref: sub.squareSubscriptionId };
  if (sub.stripeSubscriptionId) return { name: "stripe", ref: sub.stripeSubscriptionId };
  return null;
}

type Params = Promise<{ memberId: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { error } = await requireAuth("members");
  if (error) return error;

  const { memberId: rawId } = await params;
  const memberId = parseInt(rawId, 10);

  const settings = await getGymSettings();
  if (!settings.familyDiscountEnabled) {
    return NextResponse.json({ error: "Family discounts not enabled" }, { status: 400 });
  }

  const sub = await prisma.subscription.findFirst({
    where: { memberId, status: { in: ["active", "trial"] } },
    orderBy: { createdAt: "desc" },
    include: { plan: { select: { priceCents: true } } },
  });

  if (!sub) {
    return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
  }
  const providerRef = subscriptionProviderRef(sub);
  if (!providerRef) {
    return NextResponse.json({ error: "Subscription has no payment provider ID" }, { status: 400 });
  }

  const provider = await getProviderByName(providerRef.name);
  if (!provider) {
    return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
  }

  await provider.setSubscriptionDiscount(providerRef.ref, settings.familyDiscountPercent, {
    priceCents: sub.plan.priceCents,
    currency: settings.currency,
  });
  await prisma.subscription.update({ where: { id: sub.id }, data: { familyDiscountApplied: true } });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  const { error } = await requireAuth("members");
  if (error) return error;

  const { memberId: rawId } = await params;
  const memberId = parseInt(rawId, 10);

  const sub = await prisma.subscription.findFirst({
    where: { memberId, status: { in: ["active", "trial"] }, familyDiscountApplied: true },
    orderBy: { createdAt: "desc" },
    include: { plan: { select: { priceCents: true } } },
  });

  if (!sub) {
    return NextResponse.json({ error: "No discounted subscription found" }, { status: 404 });
  }

  const providerRef = subscriptionProviderRef(sub);
  if (providerRef) {
    const provider = await getProviderByName(providerRef.name);
    if (!provider) {
      return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
    }
    const settings = await getGymSettings();
    await provider.setSubscriptionDiscount(providerRef.ref, null, {
      priceCents: sub.plan.priceCents,
      currency: settings.currency,
    });
  }
  await prisma.subscription.update({ where: { id: sub.id }, data: { familyDiscountApplied: false } });

  return NextResponse.json({ ok: true });
}
