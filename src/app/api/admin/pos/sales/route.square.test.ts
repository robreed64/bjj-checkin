import { describe, it, expect, vi, beforeEach } from "vitest";
import { CardDeclinedError, NoCardOnFileError } from "@/lib/payments/types";

vi.mock("@/lib/prisma", () => import("@/test/prisma-mock"));
vi.mock("@/lib/require-auth", () => ({ requireAuth: vi.fn().mockResolvedValue({ session: { user: { role: "admin" } } }) }));
vi.mock("@/lib/payments/provider", () => ({ getPaymentProvider: vi.fn() }));
vi.mock("@/lib/gym-settings", () => ({ getGymSettings: vi.fn().mockResolvedValue({ currency: "usd" }) }));

import { prisma } from "@/test/prisma-mock";
import { getPaymentProvider } from "@/lib/payments/provider";
import { POST } from "./route";

function saleRequest(body: object) {
  return new Request("http://localhost/api/admin/pos/sales", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// $5.00 drink at 10% tax → line total 550
const drink = { id: 1, priceCents: 500, taxRate: "10", stock: 10, category: "drinks" } as never;

function stubItemsAndTransaction() {
  prisma.item.findMany.mockResolvedValue([drink]);
  (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
    async (fn: (tx: typeof prisma) => unknown) => fn(prisma)
  );
  prisma.sale.create.mockResolvedValue({ id: 21, totalCents: 1100 } as never);
  prisma.item.updateMany.mockResolvedValue({ count: 1 } as never);
}

function squareProviderStub(overrides: { charge?: ReturnType<typeof vi.fn> } = {}) {
  return {
    name: "square" as const,
    chargeCardOnFile: overrides.charge ?? vi.fn().mockResolvedValue("sq_pay_123"),
  };
}

const squareMember = {
  id: 5,
  stripeCustomerId: null,
  squareCustomerId: "sq_cus_123",
  squareCardId: "ccof:abc",
} as never;

beforeEach(() => {
  vi.mocked(getPaymentProvider).mockReset();
});

describe("POST /api/admin/pos/sales — Square card on file", () => {
  it("charges via the provider and stores the Square payment id on the sale", async () => {
    stubItemsAndTransaction();
    prisma.member.findUnique.mockResolvedValue(squareMember);
    const provider = squareProviderStub();
    vi.mocked(getPaymentProvider).mockResolvedValue(provider as never);

    const res = await POST(saleRequest({
      memberId: 5,
      paymentMethodType: "card_on_file",
      lineItems: [{ itemId: 1, quantity: 2 }],
    }));

    expect(res.status).toBe(201);
    expect(provider.chargeCardOnFile).toHaveBeenCalledWith({
      member: squareMember,
      amountCents: 1100,
      currency: "usd",
      metadata: { memberId: "5", source: "pos" },
    });
    expect(prisma.sale.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        squarePaymentId: "sq_pay_123",
        stripePaymentIntentId: null,
      }),
    }));
  });

  it("400s when the member has no Square customer", async () => {
    prisma.item.findMany.mockResolvedValue([drink]);
    prisma.member.findUnique.mockResolvedValue({
      id: 5, stripeCustomerId: "cus_legacy", squareCustomerId: null, squareCardId: null,
    } as never);
    vi.mocked(getPaymentProvider).mockResolvedValue(squareProviderStub() as never);

    const res = await POST(saleRequest({
      memberId: 5, paymentMethodType: "card_on_file", lineItems: [{ itemId: 1, quantity: 1 }],
    }));

    expect(res.status).toBe(400);
    expect(prisma.sale.create).not.toHaveBeenCalled();
  });

  it("402s on decline without recording a sale or touching stock", async () => {
    prisma.item.findMany.mockResolvedValue([drink]);
    prisma.member.findUnique.mockResolvedValue(squareMember);
    vi.mocked(getPaymentProvider).mockResolvedValue(
      squareProviderStub({ charge: vi.fn().mockRejectedValue(new CardDeclinedError("INSUFFICIENT_FUNDS")) }) as never
    );

    const res = await POST(saleRequest({
      memberId: 5, paymentMethodType: "card_on_file", lineItems: [{ itemId: 1, quantity: 1 }],
    }));

    expect(res.status).toBe(402);
    expect((await res.json()).error).toContain("declined");
    expect(prisma.sale.create).not.toHaveBeenCalled();
    expect(prisma.item.updateMany).not.toHaveBeenCalled();
  });

  it("400s when the provider reports no card on file", async () => {
    prisma.item.findMany.mockResolvedValue([drink]);
    prisma.member.findUnique.mockResolvedValue(squareMember);
    vi.mocked(getPaymentProvider).mockResolvedValue(
      squareProviderStub({ charge: vi.fn().mockRejectedValue(new NoCardOnFileError("Member has no card on file")) }) as never
    );

    const res = await POST(saleRequest({
      memberId: 5, paymentMethodType: "card_on_file", lineItems: [{ itemId: 1, quantity: 1 }],
    }));

    expect(res.status).toBe(400);
    expect(prisma.sale.create).not.toHaveBeenCalled();
  });

  it("502s on unexpected provider errors", async () => {
    prisma.item.findMany.mockResolvedValue([drink]);
    prisma.member.findUnique.mockResolvedValue(squareMember);
    vi.mocked(getPaymentProvider).mockResolvedValue(
      squareProviderStub({ charge: vi.fn().mockRejectedValue(new Error("network")) }) as never
    );

    const res = await POST(saleRequest({
      memberId: 5, paymentMethodType: "card_on_file", lineItems: [{ itemId: 1, quantity: 1 }],
    }));

    expect(res.status).toBe(502);
    expect(prisma.sale.create).not.toHaveBeenCalled();
  });

  it("503s when no provider is configured", async () => {
    prisma.item.findMany.mockResolvedValue([drink]);
    // With no provider the customer guard falls back to the Stripe column
    prisma.member.findUnique.mockResolvedValue({
      id: 5, stripeCustomerId: "cus_123", squareCustomerId: null, squareCardId: null,
    } as never);
    vi.mocked(getPaymentProvider).mockResolvedValue(null);

    const res = await POST(saleRequest({
      memberId: 5, paymentMethodType: "card_on_file", lineItems: [{ itemId: 1, quantity: 1 }],
    }));

    expect(res.status).toBe(503);
  });
});
