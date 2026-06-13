// Shared types for the payment-provider abstraction. The gym runs on one
// provider at a time (GymSettings.paymentProvider), but refs for both live on
// the same rows so legacy subscriptions keep working after a switch.

export type ProviderName = "stripe" | "square";

// Routes map these to HTTP statuses: declined → 402, no card → 400.
// Anything else a provider throws is a 502-level processing failure.
export class CardDeclinedError extends Error {}
export class NoCardOnFileError extends Error {}

export type CardSummary = { brand: string | null; last4: string | null };

// What the client needs to start card collection. Stripe drives Elements from
// a SetupIntent clientSecret; Square tokenizes entirely client-side, so only
// the customer id comes back.
export type CardSetupSession = {
  provider: ProviderName;
  customerId: string;
  clientSecret?: string;
};

// The provider-owned columns on Member — each provider reads only its own.
export type MemberPaymentRefs = {
  id?: number;
  stripeCustomerId: string | null;
  squareCustomerId?: string | null;
  squareCardId?: string | null;
};

// The provider-owned columns on MembershipPlan.
export type PlanRefs = {
  stripePriceId?: string | null;
  squareCatalogPlanId?: string | null;
  squarePlanVariationId?: string | null;
};

export type PlanInput = {
  name: string;
  description?: string | null;
  priceCents: number;
  billingInterval: string; // 'monthly' | 'yearly'
  currency: string;
};

export type PromoValidation =
  | {
      valid: true;
      coupon: {
        name: string;
        percentOff: number | null;
        amountOff: number | null;
        currency: string | null;
        duration: string;
      };
    }
  | { valid: false; unsupported?: boolean };
