import Stripe from "stripe";
import { getGymSettings } from "./gym-settings";

export async function getStripeClient(): Promise<Stripe | null> {
  const settings = await getGymSettings();
  const key = settings.stripeSecretKey || process.env.STRIPE_SECRET_KEY;
  if (!key || key === "sk_test_...") return null;
  return new Stripe(key);
}

export async function getStripeWebhookSecret(): Promise<string | null> {
  const settings = await getGymSettings();
  return settings.stripeWebhookSecret || process.env.STRIPE_WEBHOOK_SECRET || null;
}

export function maskKey(key: string | null | undefined): string {
  if (!key) return "";
  if (key.length <= 8) return "****";
  return key.slice(0, 7) + "****" + key.slice(-4);
}
