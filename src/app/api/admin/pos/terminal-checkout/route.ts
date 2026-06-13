import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { getGymSettings } from "@/lib/gym-settings";
import { priceCart, type WalkIn } from "@/lib/pos-sale";
import { createTerminalCheckout, cancelTerminalCheckout } from "@/lib/payments/square-terminal";

// Starts a Square Terminal checkout: the cart is priced and snapshotted now,
// the customer taps on the device, and the sale is recorded when polling (or
// the webhook) sees the checkout complete.
export async function POST(req: Request) {
  const { error } = await requireAuth("pos");
  if (error) return error;

  const {
    memberId,
    lineItems,
    walkIn,
  }: {
    memberId:  number | null;
    lineItems: { itemId: number; quantity: number }[];
    walkIn?:   WalkIn;
  } = await req.json();

  if (!lineItems?.length) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const cart = await priceCart(lineItems);
  if ("error" in cart) {
    return NextResponse.json({ error: cart.error }, { status: 400 });
  }
  if (cart.hasDayPass && !memberId && !walkIn?.name?.trim()) {
    return NextResponse.json({ error: "Day pass requires a member or a walk-in name" }, { status: 400 });
  }

  let checkout;
  try {
    const settings = await getGymSettings();
    checkout = await createTerminalCheckout({
      amountCents: cart.totalCents,
      currency:    settings.currency,
      referenceId: crypto.randomUUID(),
      note:        "POS sale",
    });
  } catch (err) {
    console.error("Terminal checkout failed:", err);
    return NextResponse.json({ error: "Could not reach the Square Terminal — try again" }, { status: 502 });
  }
  if (!checkout) {
    return NextResponse.json({ error: "Square Terminal is not configured" }, { status: 503 });
  }

  try {
    const row = await prisma.terminalCheckout.create({
      data: {
        squareCheckoutId: checkout.checkoutId,
        status:     "pending",
        memberId:   memberId ?? null,
        walkIn:     walkIn ? { name: walkIn.name, email: walkIn.email, phone: walkIn.phone } : undefined,
        lineItems:  cart.saleLines,
        totalCents: cart.totalCents,
      },
    });
    return NextResponse.json({ id: row.id, totalCents: cart.totalCents }, { status: 201 });
  } catch (err) {
    // The device is already showing the charge — pull it back
    await cancelTerminalCheckout(checkout.checkoutId).catch(() => {});
    console.error("Terminal checkout record failed:", err);
    return NextResponse.json({ error: "Checkout could not be started — try again" }, { status: 500 });
  }
}
