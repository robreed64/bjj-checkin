import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments/provider";

// Public like the rest of the enroll flow. Validation only — the discount is
// applied server-side in /api/enroll from a fresh lookup, so nothing here is
// trusted at charge time. Promotion codes are managed in the Stripe dashboard;
// Square has no equivalent, so the enroll UI hides the field for Square gyms.
export async function POST(req: NextRequest) {
  const { code } = await req.json();
  if (!code?.trim()) return NextResponse.json({ valid: false });

  const provider = await getPaymentProvider();
  if (!provider) return NextResponse.json({ error: "Payments not configured" }, { status: 503 });

  const result = await provider.validatePromoCode(code);
  return NextResponse.json(result);
}
