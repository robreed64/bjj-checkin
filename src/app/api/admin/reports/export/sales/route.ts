import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { toCSV, csvResponse } from "@/lib/csv";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      member: { select: { name: true } },
      lineItems: { include: { item: { select: { name: true, category: true } } } },
    },
  });

  const headers = ["Date", "Member", "Items", "Payment Method", "Total"];
  const rows = sales.map((s) => {
    const items = s.lineItems
      .map((li) => `${li.item.name} x${li.quantity}`)
      .join("; ");
    return [
      s.createdAt.toISOString().split("T")[0],
      s.member?.name ?? "Walk-in",
      items,
      s.paymentMethodType,
      `$${(s.totalCents / 100).toFixed(2)}`,
    ];
  });

  const date = new Date().toISOString().split("T")[0];
  return csvResponse(`sales-${date}.csv`, toCSV(headers, rows));
}
