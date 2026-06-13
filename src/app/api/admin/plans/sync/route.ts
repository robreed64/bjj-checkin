import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { getPaymentProvider } from "@/lib/payments/provider";
import { getGymSettings } from "@/lib/gym-settings";

// Backfills provider refs for plans created while the other provider was
// active (e.g. after switching Stripe → Square). Idempotent: plans that
// already have refs on the active provider are skipped.
export async function POST() {
  const { error } = await requireAuth("plans");
  if (error) return error;

  const provider = await getPaymentProvider();
  if (!provider) {
    return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
  }

  const settings = await getGymSettings();
  const plans = await prisma.membershipPlan.findMany();
  const missing = plans.filter((p) =>
    provider.name === "square" ? !p.squarePlanVariationId : !p.stripePriceId
  );

  let synced = 0;
  const failures: string[] = [];
  for (const plan of missing) {
    try {
      const refs = await provider.createPlan({
        name: plan.name,
        description: plan.description,
        priceCents: plan.priceCents,
        billingInterval: plan.billingInterval,
        currency: settings.currency,
      });
      await prisma.membershipPlan.update({ where: { id: plan.id }, data: refs });
      synced++;
    } catch (err) {
      console.error(`Plan sync failed for "${plan.name}":`, err);
      failures.push(plan.name);
    }
  }

  return NextResponse.json({ synced, skipped: plans.length - missing.length, failures });
}
