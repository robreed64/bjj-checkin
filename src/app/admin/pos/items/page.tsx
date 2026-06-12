import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getGymSettings } from "@/lib/gym-settings";
import ItemsManager from "./ItemsManager";

export default async function ItemsPage() {
  const [items, settings] = await Promise.all([
    prisma.item.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
    getGymSettings(),
  ]);
  const categories = (settings.posCategories as string[] | null) ?? ["drinks", "gear", "events"];
  if (!categories.includes("day_pass")) categories.push("day_pass");

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/admin/pos" className="text-sm text-gray-400 hover:text-white transition mb-1 inline-flex items-center gap-1">
            ← POS
          </Link>
          <h1 className="text-2xl font-bold text-white mt-1">Item Management</h1>
        </div>
      </div>
      <ItemsManager categories={categories} initialItems={items.map((i) => ({
        id:         i.id,
        name:       i.name,
        priceCents: i.priceCents,
        taxRate:    Number(i.taxRate),
        stock:      i.stock,
        category:   i.category,
        barcode:    i.barcode,
      }))} />
    </div>
  );
}
