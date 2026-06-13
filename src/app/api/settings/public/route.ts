import { NextResponse } from "next/server";
import { getGymSettings } from "@/lib/gym-settings";

export async function GET() {
  const settings = await getGymSettings();
  return NextResponse.json({
    gymName: settings.gymName,
    logoUrl: settings.logoUrl || null,
    paymentProvider: settings.paymentProvider || "stripe",
    stripePublishableKey: settings.stripePublishableKey || null,
    // Client-side Web Payments SDK init values — safe to expose (never the access token)
    squareApplicationId: settings.squareApplicationId || null,
    squareLocationId: settings.squareLocationId || null,
    squareEnvironment: settings.squareEnvironment || "sandbox",
    waiverText: settings.waiverText || null,
  });
}
