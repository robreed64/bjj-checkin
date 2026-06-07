import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 50;

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      orderBy: { createdAt: "desc" },
      skip:  (page - 1) * limit,
      take:  limit,
      include: {
        member:    { select: { id: true, name: true } },
        lineItems: { include: { item: { select: { name: true, category: true } } } },
      },
    }),
    prisma.sale.count(),
  ]);

  return NextResponse.json({ sales, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(req: Request) {
  const {
    memberId,
    paymentMethodType,
    lineItems,
  }: {
    memberId:          number | null;
    paymentMethodType: string;
    lineItems:         { itemId: number; quantity: number; unitPriceCents: number }[];
  } = await req.json();

  const totalCents = lineItems.reduce((sum, li) => sum + li.unitPriceCents * li.quantity, 0);

  const sale = await prisma.sale.create({
    data: {
      memberId:          memberId ?? null,
      totalCents,
      paymentMethodType,
      lineItems: {
        create: lineItems.map((li) => ({
          itemId:         li.itemId,
          quantity:       li.quantity,
          unitPriceCents: li.unitPriceCents,
        })),
      },
    },
    include: {
      lineItems: { include: { item: true } },
      member:    { select: { id: true, name: true } },
    },
  });

  // Decrement stock for items that track it
  await Promise.all(
    lineItems.map((li) =>
      prisma.item.updateMany({
        where: { id: li.itemId, stock: { not: null } },
        data:  { stock: { decrement: li.quantity } },
      })
    )
  );

  return NextResponse.json(sale, { status: 201 });
}
