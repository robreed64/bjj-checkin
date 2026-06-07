import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { stripeConfigured } from "@/lib/stripe";

export default async function PlansPage() {
  const plans = await prisma.membershipPlan.findMany({ orderBy: { priceCents: "asc" } });

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Membership Plans</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {stripeConfigured ? (
              <span className="text-green-400">● Stripe connected</span>
            ) : (
              <span className="text-yellow-400">● Stripe not configured — add keys to .env.local</span>
            )}
          </p>
        </div>
        <Link
          href="/admin/plans/new"
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold transition"
        >
          + New Plan
        </Link>
      </div>

      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/60 text-gray-400 text-left">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium text-right">Price</th>
              <th className="px-4 py-3 font-medium">Interval</th>
              <th className="px-4 py-3 font-medium">Stripe</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {plans.map((plan) => (
              <tr key={plan.id} className="hover:bg-gray-900/40 transition">
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{plan.name}</div>
                  {plan.description && <div className="text-gray-500 text-xs">{plan.description}</div>}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 text-xs capitalize">
                    {plan.planType}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-medium text-white">
                  ${(plan.priceCents / 100).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-gray-400 capitalize">{plan.billingInterval}</td>
                <td className="px-4 py-3">
                  {plan.stripePriceId ? (
                    <span className="text-green-400 text-xs">● Synced</span>
                  ) : (
                    <span className="text-gray-600 text-xs">— Not synced</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/plans/${plan.id}/edit`}
                    className="text-xs text-gray-400 hover:text-white transition"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
