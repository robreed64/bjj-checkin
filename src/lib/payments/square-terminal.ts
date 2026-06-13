import { getSquareContext } from "./square-client";
import type { Square } from "square";

// Square Terminal hardware checkouts. These sit outside the PaymentProvider
// interface — Stripe has no equivalent flow here, and the charge completes
// asynchronously on the device (poll or terminal.checkout.updated webhook).

export type TerminalCheckoutState = {
  checkoutId: string;
  status: string; // PENDING, IN_PROGRESS, CANCEL_REQUESTED, CANCELED, COMPLETED
  paymentId: string | null;
};

function toState(checkout: Square.TerminalCheckout | undefined): TerminalCheckoutState {
  if (!checkout?.id) throw new Error("Square returned no terminal checkout");
  return {
    checkoutId: checkout.id,
    status: checkout.status ?? "PENDING",
    paymentId: checkout.paymentIds?.[0] ?? null,
  };
}

export async function createTerminalCheckout(p: {
  amountCents: number;
  currency: string;
  referenceId: string;
  note?: string;
}): Promise<TerminalCheckoutState | null> {
  const ctx = await getSquareContext();
  if (!ctx || !ctx.config.terminalDeviceId) return null;
  const res = await ctx.client.terminal.checkouts.create({
    idempotencyKey: crypto.randomUUID(),
    checkout: {
      amountMoney: {
        amount: BigInt(p.amountCents),
        currency: p.currency.toUpperCase() as Square.Currency,
      },
      referenceId: p.referenceId,
      note: p.note,
      deviceOptions: { deviceId: ctx.config.terminalDeviceId },
      // Auto-cancel on the device if nobody taps within 5 minutes
      deadlineDuration: "PT5M",
    },
  });
  return toState(res.checkout);
}

export async function getTerminalCheckout(checkoutId: string): Promise<TerminalCheckoutState | null> {
  const ctx = await getSquareContext();
  if (!ctx) return null;
  const res = await ctx.client.terminal.checkouts.get({ checkoutId });
  return toState(res.checkout);
}

export async function cancelTerminalCheckout(checkoutId: string): Promise<TerminalCheckoutState | null> {
  const ctx = await getSquareContext();
  if (!ctx) return null;
  const res = await ctx.client.terminal.checkouts.cancel({ checkoutId });
  return toState(res.checkout);
}

// ── Device pairing (Square Terminal hardware only — the small Square Reader
//    pairs with mobile SDKs, not the Terminal API) ───────────────────────────

export type DeviceCodeState = {
  id: string;
  code: string | null;
  status: string; // UNPAIRED, PAIRED, EXPIRED
  deviceId: string | null;
};

export async function createDeviceCode(): Promise<DeviceCodeState | null> {
  const ctx = await getSquareContext();
  if (!ctx) return null;
  const res = await ctx.client.devices.codes.create({
    idempotencyKey: crypto.randomUUID(),
    deviceCode: {
      name: "BJJ Check-in POS",
      productType: "TERMINAL_API",
      locationId: ctx.config.locationId,
    },
  });
  const dc = res.deviceCode;
  if (!dc?.id) throw new Error("Square returned no device code");
  return { id: dc.id, code: dc.code ?? null, status: dc.status ?? "UNPAIRED", deviceId: dc.deviceId ?? null };
}

export async function getDeviceCode(id: string): Promise<DeviceCodeState | null> {
  const ctx = await getSquareContext();
  if (!ctx) return null;
  const res = await ctx.client.devices.codes.get({ id });
  const dc = res.deviceCode;
  if (!dc?.id) return null;
  return { id: dc.id, code: dc.code ?? null, status: dc.status ?? "UNPAIRED", deviceId: dc.deviceId ?? null };
}
