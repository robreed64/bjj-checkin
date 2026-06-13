import Stripe from "stripe";
import type { PaymentProvider } from "./provider";
import {
  CardDeclinedError,
  NoCardOnFileError,
  type CardSetupSession,
  type CardSummary,
  type MemberPaymentRefs,
  type PlanInput,
  type PlanRefs,
  type PromoValidation,
} from "./types";

// Wraps the Stripe calls that used to live inline in the route handlers.
// Behavior is intentionally identical to the pre-refactor routes.
export class StripeProvider implements PaymentProvider {
  readonly name = "stripe" as const;

  constructor(private stripe: Stripe) {}

  async createCustomer(p: { name: string; email?: string | null }): Promise<string> {
    const customer = await this.stripe.customers.create({
      name: p.name,
      email: p.email || undefined,
    });
    return customer.id;
  }

  async tagCustomerWithMember(customerId: string, memberId: number): Promise<void> {
    await this.stripe.customers
      .update(customerId, { metadata: { memberId: String(memberId) } })
      .catch(() => {});
  }

  async beginCardSetup(customerId: string): Promise<CardSetupSession> {
    const setupIntent = await this.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
    });
    return { provider: "stripe", customerId, clientSecret: setupIntent.client_secret ?? undefined };
  }

  async saveCard(customerId: string, token: string): Promise<{ cardId: string; card: CardSummary | null }> {
    const pm = await this.stripe.paymentMethods.attach(token, { customer: customerId });
    await this.stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: token },
    });
    return {
      cardId: token,
      card: pm.card ? { brand: pm.card.brand ?? null, last4: pm.card.last4 ?? null } : null,
    };
  }

  async getDefaultCard(member: MemberPaymentRefs): Promise<CardSummary | null> {
    if (!member.stripeCustomerId) return null;
    try {
      const customer = await this.stripe.customers.retrieve(member.stripeCustomerId, {
        expand: ["invoice_settings.default_payment_method"],
      });
      if ("deleted" in customer) return null;
      const pm = customer.invoice_settings?.default_payment_method;
      if (!pm || typeof pm === "string") return null;
      return { brand: pm.card?.brand ?? null, last4: pm.card?.last4 ?? null };
    } catch {
      return null;
    }
  }

  async chargeCardOnFile(p: {
    member: MemberPaymentRefs;
    amountCents: number;
    currency: string;
    metadata: Record<string, string>;
  }): Promise<string> {
    if (!p.member.stripeCustomerId) {
      throw new NoCardOnFileError("Member has no card on file");
    }
    const customer = await this.stripe.customers.retrieve(p.member.stripeCustomerId, {
      expand: ["invoice_settings.default_payment_method"],
    });
    if ("deleted" in customer) {
      throw new NoCardOnFileError("Member has no card on file");
    }
    const pm = customer.invoice_settings?.default_payment_method;
    if (!pm || typeof pm === "string") {
      throw new NoCardOnFileError(
        "No default payment method — ask the member to add a card in the member portal"
      );
    }

    try {
      const intent = await this.stripe.paymentIntents.create({
        amount: p.amountCents,
        currency: p.currency,
        customer: customer.id,
        payment_method: pm.id,
        off_session: true,
        confirm: true,
        metadata: p.metadata,
      });
      return intent.id;
    } catch (err) {
      if (err instanceof Stripe.errors.StripeCardError) {
        throw new CardDeclinedError(err.message);
      }
      throw err;
    }
  }

  async createPlan(p: PlanInput): Promise<PlanRefs> {
    const product = await this.stripe.products.create({
      name: p.name,
      description: p.description ?? undefined,
    });
    const price = await this.stripe.prices.create({
      product: product.id,
      unit_amount: p.priceCents,
      currency: p.currency,
      recurring: { interval: p.billingInterval === "yearly" ? "year" : "month" },
    });
    return { stripePriceId: price.id };
  }

  async updatePlan(refs: PlanRefs, p: PlanInput, opts: { priceChanged: boolean }): Promise<PlanRefs> {
    if (!refs.stripePriceId) return refs;

    try {
      const price = await this.stripe.prices.retrieve(refs.stripePriceId);
      const product = typeof price.product === "string" ? price.product : price.product.id;
      await this.stripe.products.update(product, {
        name: p.name,
        description: p.description ?? undefined,
      });
    } catch { /* non-fatal */ }

    if (!opts.priceChanged) return refs;

    // Archive the old price and create a new one; existing subscriptions stay
    // on the old (now inactive) price
    try {
      await this.stripe.prices.update(refs.stripePriceId, { active: false });
      const newPrice = await this.stripe.prices.create({
        currency: p.currency,
        unit_amount: p.priceCents,
        recurring: { interval: p.billingInterval === "yearly" ? "year" : "month" },
        product: (await this.stripe.prices.retrieve(refs.stripePriceId)).product as string,
      });
      return { stripePriceId: newPrice.id };
    } catch {
      return refs; /* non-fatal */
    }
  }

  async deactivatePlan(refs: PlanRefs): Promise<void> {
    if (!refs.stripePriceId) return;
    try {
      await this.stripe.prices.update(refs.stripePriceId, { active: false });
    } catch { /* non-fatal */ }
  }

  async createSubscription(p: {
    member: MemberPaymentRefs;
    planRefs: PlanRefs;
    promoCode?: string | null;
  }): Promise<{ subscriptionRef: string; status: string }> {
    if (!p.member.stripeCustomerId || !p.planRefs.stripePriceId) {
      throw new Error("Missing Stripe customer or price for subscription");
    }
    const customerId = p.member.stripeCustomerId;
    const priceId = p.planRefs.stripePriceId;

    // Re-validate the promo code server-side; an invalid code never blocks enrollment
    let promotionCodeId: string | null = null;
    if (p.promoCode?.trim()) {
      try {
        const codes = await this.stripe.promotionCodes.list({
          code: p.promoCode.trim(),
          active: true,
          limit: 1,
        });
        promotionCodeId = codes.data[0]?.id ?? null;
      } catch { /* enroll without discount */ }
    }

    const create = (withPromo: boolean) =>
      this.stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        ...(withPromo && promotionCodeId && { discounts: [{ promotion_code: promotionCodeId }] }),
        payment_behavior: "default_incomplete",
        expand: ["latest_invoice.payment_intent"],
      });

    let sub;
    try {
      sub = await create(true);
    } catch (err) {
      // A code can list as active yet be ineligible at attach time (first-time-only,
      // currency/product restrictions) — enroll without the discount rather than 500
      if (!promotionCodeId) throw err;
      console.warn("Promo code rejected at subscribe time, enrolling without it:", err);
      sub = await create(false);
    }

    return {
      subscriptionRef: sub.id,
      status: sub.status === "active" || sub.status === "trialing" ? "active" : "past_due",
    };
  }

  async cancelSubscription(subscriptionRef: string): Promise<void> {
    await this.stripe.subscriptions.cancel(subscriptionRef);
  }

  async cancelActiveSubscriptionsForCustomer(member: MemberPaymentRefs): Promise<void> {
    if (!member.stripeCustomerId) return;
    const subs = await this.stripe.subscriptions.list({
      customer: member.stripeCustomerId,
      status: "active",
    });
    await Promise.all(subs.data.map((s) => this.stripe.subscriptions.cancel(s.id)));
  }

  async updateSubscriptionCard(subscriptionRef: string, cardId: string): Promise<void> {
    await this.stripe.subscriptions.update(subscriptionRef, { default_payment_method: cardId });
  }

  async setSubscriptionDiscount(
    subscriptionRef: string,
    percent: number | null,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _plan: { priceCents: number; currency: string }
  ): Promise<void> {
    if (percent === null) {
      await this.stripe.subscriptions.update(subscriptionRef, { discounts: [] });
      return;
    }
    const couponId = await this.getOrCreateFamilyCoupon(percent);
    await this.stripe.subscriptions.update(subscriptionRef, { discounts: [{ coupon: couponId }] });
  }

  private async getOrCreateFamilyCoupon(percent: number): Promise<string> {
    const couponId = `bjj-family-${percent}pct`;
    try {
      await this.stripe.coupons.retrieve(couponId);
      return couponId;
    } catch {
      await this.stripe.coupons.create({
        id: couponId,
        percent_off: percent,
        duration: "forever",
        name: `Family Discount ${percent}%`,
      });
      return couponId;
    }
  }

  async validatePromoCode(code: string): Promise<PromoValidation> {
    try {
      const codes = await this.stripe.promotionCodes.list({
        code: code.trim(),
        active: true,
        limit: 1,
        expand: ["data.promotion.coupon"],
      });
      const pc = codes.data[0];
      const coupon = pc?.promotion?.coupon;
      if (!pc || !coupon || typeof coupon === "string") return { valid: false };
      return {
        valid: true,
        coupon: {
          name: coupon.name ?? pc.code,
          percentOff: coupon.percent_off ?? null,
          amountOff: coupon.amount_off ?? null,
          currency: coupon.currency ?? null,
          duration: coupon.duration,
        },
      };
    } catch {
      return { valid: false };
    }
  }
}
