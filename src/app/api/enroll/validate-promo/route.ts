import { NextRequest, NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe";

// Public like the rest of the enroll flow. Validation only — the discount is
// applied server-side in /api/enroll from a fresh lookup, so nothing here is
// trusted at charge time. Promotion codes are managed in the Stripe dashboard.
export async function POST(req: NextRequest) {
  const { code } = await req.json();
  if (!code?.trim()) return NextResponse.json({ valid: false });

  const stripe = await getStripeClient();
  if (!stripe) return NextResponse.json({ error: "Payments not configured" }, { status: 503 });

  try {
    const codes = await stripe.promotionCodes.list({
      code: code.trim(),
      active: true,
      limit: 1,
      expand: ["data.promotion.coupon"],
    });
    const pc = codes.data[0];
    const coupon = pc?.promotion?.coupon;
    if (!pc || !coupon || typeof coupon === "string") {
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({
      valid: true,
      coupon: {
        name:       coupon.name ?? pc.code,
        percentOff: coupon.percent_off ?? null,
        amountOff:  coupon.amount_off ?? null,
        currency:   coupon.currency ?? null,
        duration:   coupon.duration,
      },
    });
  } catch {
    return NextResponse.json({ valid: false });
  }
}
