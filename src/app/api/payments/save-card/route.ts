import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments/provider";
import { CardDeclinedError } from "@/lib/payments/types";

// Stores a tokenized card on a provider customer. Used by the Square enroll
// flow (Web Payments SDK nonce → stored card); Stripe saves cards client-side
// via confirmSetup so it never calls this.
export async function POST(req: NextRequest) {
  const provider = await getPaymentProvider();
  if (!provider) return NextResponse.json({ error: "Payments not configured" }, { status: 503 });

  const { customerId, token } = await req.json();
  if (!customerId || !token) {
    return NextResponse.json({ error: "customerId and token are required" }, { status: 400 });
  }

  try {
    const saved = await provider.saveCard(customerId, token);
    return NextResponse.json(saved);
  } catch (err) {
    if (err instanceof CardDeclinedError) {
      return NextResponse.json({ error: `Card declined: ${err.message}` }, { status: 402 });
    }
    console.error("save-card failed:", err);
    return NextResponse.json({ error: "Failed to save card" }, { status: 502 });
  }
}
