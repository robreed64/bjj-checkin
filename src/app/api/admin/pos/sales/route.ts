import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { getPaymentProvider } from "@/lib/payments/provider";
import { CardDeclinedError, NoCardOnFileError } from "@/lib/payments/types";
import { getGymSettings } from "@/lib/gym-settings";
import { priceCart, recordSale, type WalkIn } from "@/lib/pos-sale";

export async function GET(req: Request) {
  const { error } = await requireAuth("pos");
  if (error) return error;

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
  const { error } = await requireAuth("pos");
  if (error) return error;

  const {
    memberId,
    paymentMethodType,
    lineItems,
    walkIn,
  }: {
    memberId:          number | null;
    paymentMethodType: string;
    lineItems:         { itemId: number; quantity: number }[];
    walkIn?:           WalkIn;
  } = await req.json();

  if (!lineItems?.length) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const cart = await priceCart(lineItems);
  if ("error" in cart) {
    return NextResponse.json({ error: cart.error }, { status: 400 });
  }

  // A day pass must be tied to a person (so they're checked in and enter the trial funnel)
  if (cart.hasDayPass && !memberId && !walkIn?.name?.trim()) {
    return NextResponse.json({ error: "Day pass requires a member or a walk-in name" }, { status: 400 });
  }

  // Charge the saved card before recording anything; declined cards never produce a Sale
  let stripePaymentIntentId: string | null = null;
  let squarePaymentId: string | null = null;
  if (paymentMethodType === "card_on_file") {
    if (!memberId) {
      return NextResponse.json({ error: "Select a member to charge their card on file" }, { status: 400 });
    }
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true, stripeCustomerId: true, squareCustomerId: true, squareCardId: true },
    });
    const provider = await getPaymentProvider();
    const hasCustomer = provider?.name === "square" ? member?.squareCustomerId : member?.stripeCustomerId;
    if (!member || !hasCustomer) {
      return NextResponse.json({ error: "Member has no card on file" }, { status: 400 });
    }
    if (!provider) {
      return NextResponse.json({ error: "Payments are not configured" }, { status: 503 });
    }

    const settings = await getGymSettings();
    try {
      const paymentRef = await provider.chargeCardOnFile({
        member,
        amountCents: cart.totalCents,
        currency:    settings.currency,
        metadata:    { memberId: String(memberId), source: "pos" },
      });
      if (provider.name === "square") squarePaymentId = paymentRef;
      else stripePaymentIntentId = paymentRef;
    } catch (err) {
      if (err instanceof NoCardOnFileError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      if (err instanceof CardDeclinedError) {
        return NextResponse.json({ error: `Card declined: ${err.message}` }, { status: 402 });
      }
      console.error("POS charge failed:", err);
      return NextResponse.json({ error: "Payment failed — try another method" }, { status: 502 });
    }
  }

  try {
    const { sale, checkedIn, waiverPending } = await recordSale({
      memberId,
      walkIn,
      paymentMethodType,
      totalCents: cart.totalCents,
      saleLines:  cart.saleLines,
      hasDayPass: cart.hasDayPass,
      stripePaymentIntentId,
      squarePaymentId,
    });

    return NextResponse.json({ ...sale, checkedIn, waiverPending }, { status: 201 });
  } catch (err) {
    // Card was already charged; surface the payment ref so the sale can be reconciled
    const ref = stripePaymentIntentId ?? squarePaymentId ?? "none";
    console.error(`POS sale record failed (payment: ${ref}):`, err);
    return NextResponse.json(
      { error: "Sale could not be recorded — check the payment dashboard before retrying" },
      { status: 500 }
    );
  }
}
