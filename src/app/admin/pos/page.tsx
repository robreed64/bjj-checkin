import Link from "next/link";
import { prisma } from "@/lib/prisma";
import POSTerminal from "./POSTerminal";
import { getGymSettings } from "@/lib/gym-settings";

export default async function POSPage() {
  const [items, settings] = await Promise.all([
    prisma.item.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
    getGymSettings(),
  ]);
  const categories = (settings.posCategories as string[] | null) ?? ["drinks", "gear", "events"];

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900/80 flex-shrink-0">
        <h1 className="font-bold text-white">Point of Sale</h1>
        <div className="flex gap-3">
          <Link href="/admin/pos/sales"
            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-medium transition">
            Sales History
          </Link>
          <Link href="/admin/pos/items"
            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-medium transition">
            Manage Items
          </Link>
        </div>
      </div>

      {/* Terminal — fills remaining height */}
      <div className="flex-1 overflow-hidden">
        <POSTerminal categories={categories} initialItems={items.map((i) => ({
          id:         i.id,
          name:       i.name,
          priceCents: i.priceCents,
          taxRate:    Number(i.taxRate),
          stock:      i.stock,
          category:   i.category,
          barcode:    i.barcode,
        }))} />
      </div>
    </div>
  );
}
