import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

type Params = Promise<{ id: string }>;

export async function PUT(req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const { name, barcode, priceCents, taxRate, stock, category } = await req.json();
  const item = await prisma.item.update({
    where: { id: Number(id) },
    data: {
      name,
      barcode:    barcode || null,
      priceCents: Number(priceCents),
      taxRate:    Number(taxRate ?? 0),
      stock:      stock != null ? Number(stock) : null,
      category,
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  await prisma.item.delete({ where: { id: Number(id) } });
  return new NextResponse(null, { status: 204 });
}
