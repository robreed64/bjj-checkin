import Stripe from "stripe";

export const stripeConfigured =
  !!process.env.STRIPE_SECRET_KEY &&
  !process.env.STRIPE_SECRET_KEY.startsWith("sk_test_...");

export const stripe = stripeConfigured
  ? new Stripe(process.env.STRIPE_SECRET_KEY!)
  : null;
