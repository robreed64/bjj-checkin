import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { createHmac } from "crypto";

vi.mock("@/lib/prisma", () => import("@/test/prisma-mock"));
vi.mock("@/lib/payments/square-client", () => ({ getSquareConfig: vi.fn() }));
vi.mock("@/lib/pos-sale", () => ({
  finalizeTerminalCheckout: vi.fn(),
  markTerminalCheckoutEnded: vi.fn(),
}));

import { prisma } from "@/test/prisma-mock";
import { getSquareConfig } from "@/lib/payments/square-client";
import { finalizeTerminalCheckout, markTerminalCheckoutEnded } from "@/lib/pos-sale";
import { POST } from "./route";

const SIGNATURE_KEY = "test-signature-key";
const WEBHOOK_URL = "https://gym.example.com/api/square/webhook";
process.env.SQUARE_WEBHOOK_URL = WEBHOOK_URL;
afterAll(() => { delete process.env.SQUARE_WEBHOOK_URL; });

function sign(body: string): string {
  // Square signs HMAC-SHA256(key, notificationUrl + rawBody), base64-encoded
  return createHmac("sha256", SIGNATURE_KEY).update(WEBHOOK_URL + body).digest("base64");
}

function webhookRequest(event: object, signature?: string) {
  const body = JSON.stringify(event);
  return new Request(WEBHOOK_URL, {
    method: "POST",
    body,
    headers: { "x-square-hmacsha256-signature": signature ?? sign(body) },
  }) as never;
}

const config = {
  accessToken: "tok", applicationId: "app", locationId: "loc",
  environment: "sandbox", webhookSignatureKey: SIGNATURE_KEY, terminalDeviceId: null,
};

beforeEach(() => {
  vi.mocked(getSquareConfig).mockResolvedValue(config as never);
  vi.mocked(finalizeTerminalCheckout).mockReset();
  vi.mocked(markTerminalCheckoutEnded).mockReset();
});

describe("POST /api/square/webhook — security", () => {
  it("rejects an invalid signature", async () => {
    const res = await POST(webhookRequest({ type: "subscription.updated" }, "bogus"));
    expect(res.status).toBe(400);
    expect(prisma.subscription.updateMany).not.toHaveBeenCalled();
  });

  it("503s when no signature key is configured", async () => {
    vi.mocked(getSquareConfig).mockResolvedValue({ ...config, webhookSignatureKey: null } as never);
    const res = await POST(webhookRequest({ type: "subscription.updated" }));
    expect(res.status).toBe(503);
  });
});

describe("POST /api/square/webhook — subscription status sync", () => {
  it("maps CANCELED, stamps canceledAt on the transition, and mirrors Member.status", async () => {
    prisma.subscription.updateMany.mockResolvedValue({ count: 1 } as never);
    prisma.subscription.findFirst.mockResolvedValue({ id: 1, memberId: 9 } as never);
    prisma.member.update.mockResolvedValue({} as never);

    const res = await POST(webhookRequest({
      type: "subscription.updated",
      data: { object: { subscription: { id: "sq_sub_1", status: "CANCELED" } } },
    }));

    expect(res.status).toBe(200);
    // canceledAt stamped only where status was not already canceled (churn reporting)
    expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
      where: { squareSubscriptionId: "sq_sub_1", status: { not: "canceled" } },
      data: { canceledAt: expect.any(Date) },
    });
    expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
      where: { squareSubscriptionId: "sq_sub_1" },
      data: expect.objectContaining({ status: "canceled" }),
    });
    expect(prisma.member.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: expect.objectContaining({ status: "canceled" }),
    });
  });

  it("maps ACTIVE without stamping canceledAt", async () => {
    prisma.subscription.updateMany.mockResolvedValue({ count: 1 } as never);
    prisma.subscription.findFirst.mockResolvedValue({ id: 1, memberId: 9 } as never);
    prisma.member.update.mockResolvedValue({} as never);

    await POST(webhookRequest({
      type: "subscription.updated",
      data: { object: { subscription: { id: "sq_sub_1", status: "ACTIVE" } } },
    }));

    expect(prisma.subscription.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
      where: { squareSubscriptionId: "sq_sub_1" },
      data: expect.objectContaining({ status: "active" }),
    });
  });
});

describe("POST /api/square/webhook — invoice events", () => {
  it("flips the member and active subscriptions to past_due on a failed charge", async () => {
    await POST(webhookRequest({
      type: "invoice.scheduled_charge_failed",
      data: { object: { invoice: { primary_recipient: { customer_id: "sq_cus_1" } } } },
    }));

    expect(prisma.member.updateMany).toHaveBeenCalledWith({
      where: { squareCustomerId: "sq_cus_1" },
      data: expect.objectContaining({ status: "past_due" }),
    });
    expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
      where: { member: { squareCustomerId: "sq_cus_1" }, status: "active" },
      data: expect.objectContaining({ status: "past_due" }),
    });
  });

  it("recovers past_due members on a successful payment", async () => {
    await POST(webhookRequest({
      type: "invoice.payment_made",
      data: { object: { invoice: { primary_recipient: { customer_id: "sq_cus_1" } } } },
    }));

    expect(prisma.member.updateMany).toHaveBeenCalledWith({
      where: { squareCustomerId: "sq_cus_1", status: "past_due" },
      data: expect.objectContaining({ status: "active" }),
    });
  });
});

describe("POST /api/square/webhook — terminal checkouts", () => {
  it("finalizes a completed terminal checkout", async () => {
    await POST(webhookRequest({
      type: "terminal.checkout.updated",
      data: { object: { checkout: { id: "tc_1", status: "COMPLETED", payment_ids: ["sq_pay_1"] } } },
    }));
    expect(finalizeTerminalCheckout).toHaveBeenCalledWith("tc_1", "sq_pay_1");
  });

  it("marks a canceled terminal checkout", async () => {
    await POST(webhookRequest({
      type: "terminal.checkout.updated",
      data: { object: { checkout: { id: "tc_1", status: "CANCELED" } } },
    }));
    expect(markTerminalCheckoutEnded).toHaveBeenCalledWith("tc_1", "canceled");
    expect(finalizeTerminalCheckout).not.toHaveBeenCalled();
  });
});
