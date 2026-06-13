import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider } from "@/lib/payments/provider";
import PlanSetupClient from "./PlanSetupClient";

export default async function SetupPlansPage() {
  const [plans, provider] = await Promise.all([
    prisma.membershipPlan.findMany({
      orderBy: { priceCents: "asc" },
      include: { _count: { select: { subscriptions: true } } },
    }),
    getPaymentProvider(),
  ]);
  const providerLabel = provider?.name === "square" ? "Square" : "Stripe";

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/setup" className="text-sm text-amber-500 hover:text-amber-300 transition">← Configure</Link>
        <h1 className="text-2xl font-bold mt-2">Plans</h1>
        <p className="text-gray-400 text-sm mt-1">
          {provider ? <span className="text-green-400">● {providerLabel} connected</span> : <span className="text-yellow-400">● {providerLabel} not configured</span>}
        </p>
      </div>
      <PlanSetupClient plans={plans.map(p => ({ ...p, subCount: p._count.subscriptions }))} stripeConfigured={!!provider} />
    </div>
  );
}
