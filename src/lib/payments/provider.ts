import { getGymSettings } from "../gym-settings";
import { getStripeClient } from "../stripe";
import { getSquareContext } from "./square-client";
import { StripeProvider } from "./stripe-provider";
import { SquareProvider } from "./square-provider";
import type {
  CardSetupSession,
  CardSummary,
  MemberPaymentRefs,
  PlanInput,
  PlanRefs,
  PromoValidation,
  ProviderName,
} from "./types";

export interface PaymentProvider {
  readonly name: ProviderName;

  // ── Customers & cards ──────────────────────────────────────────────────────
  createCustomer(p: { name: string; email?: string | null }): Promise<string>;
  /** Non-fatal best-effort: link the provider customer back to our member id. */
  tagCustomerWithMember(customerId: string, memberId: number): Promise<void>;
  beginCardSetup(customerId: string): Promise<CardSetupSession>;
  /**
   * Store a card and make it the member's default. `token` is a Stripe
   * PaymentMethod id or a Square Web Payments SDK nonce (an already-stored
   * Square card id is accepted and returned as-is).
   */
  saveCard(customerId: string, token: string): Promise<{ cardId: string; card: CardSummary | null }>;
  getDefaultCard(member: MemberPaymentRefs): Promise<CardSummary | null>;

  // ── One-off charges (POS card-on-file) ─────────────────────────────────────
  /** Returns the provider payment ref. Throws CardDeclinedError / NoCardOnFileError. */
  chargeCardOnFile(p: {
    member: MemberPaymentRefs;
    amountCents: number;
    currency: string;
    metadata: Record<string, string>;
  }): Promise<string>;

  // ── Plan catalog sync ──────────────────────────────────────────────────────
  createPlan(p: PlanInput): Promise<PlanRefs>;
  /** Price/interval changes retire the old price and mint a new one; existing subscribers stay on the old one. */
  updatePlan(refs: PlanRefs, p: PlanInput, opts: { priceChanged: boolean }): Promise<PlanRefs>;
  deactivatePlan(refs: PlanRefs): Promise<void>;

  // ── Subscriptions ──────────────────────────────────────────────────────────
  createSubscription(p: {
    member: MemberPaymentRefs;
    planRefs: PlanRefs;
    promoCode?: string | null;
  }): Promise<{ subscriptionRef: string; status: string }>;
  cancelSubscription(subscriptionRef: string): Promise<void>;
  cancelActiveSubscriptionsForCustomer(member: MemberPaymentRefs): Promise<void>;
  updateSubscriptionCard(subscriptionRef: string, cardId: string): Promise<void>;
  setSubscriptionDiscount(
    subscriptionRef: string,
    percent: number | null,
    plan: { priceCents: number; currency: string }
  ): Promise<void>;

  // ── Promo codes (Stripe-only; Square reports unsupported) ──────────────────
  validatePromoCode(code: string): Promise<PromoValidation>;
}

/**
 * The provider selected in settings, or null when its credentials are missing —
 * callers degrade gracefully (503, cash-only POS, enroll-without-payment),
 * exactly like the original getStripeClient() contract.
 */
export async function getPaymentProvider(): Promise<PaymentProvider | null> {
  const settings = await getGymSettings();
  const name = (settings.paymentProvider as ProviderName) || "stripe";
  return getProviderByName(name);
}

/**
 * A specific provider regardless of which one is selected. Used where the
 * operation must follow an existing object's provider (canceling a legacy
 * Stripe subscription after the gym switched to Square, and vice versa).
 */
export async function getProviderByName(name: ProviderName): Promise<PaymentProvider | null> {
  if (name === "square") {
    const ctx = await getSquareContext();
    return ctx ? new SquareProvider(ctx.client, ctx.config) : null;
  }
  const stripe = await getStripeClient();
  return stripe ? new StripeProvider(stripe) : null;
}
