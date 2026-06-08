import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function GET() {
  const items = await prisma.item.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  return NextResponse.json(items);
}

export async function POST(req: Request) {
  const { error } = await requireAuth("pos");
  if (error) return error;

  const { name, barcode, priceCents, taxRate, stock, category } = await req.json();
  const item = await prisma.item.create({
    data: {
      name,
      barcode:    barcode    || null,
      priceCents: Number(priceCents),
      taxRate:    Number(taxRate ?? 0),
      stock:      stock != null ? Number(stock) : null,
      category,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
