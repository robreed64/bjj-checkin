import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => import("@/test/prisma-mock"));
vi.mock("@/lib/require-auth", () => ({ requireAuth: vi.fn().mockResolvedValue({ session: { user: { role: "admin" } } }) }));
vi.mock("@/lib/gym-settings", () => ({ getGymSettings: vi.fn().mockResolvedValue({ currency: "usd" }) }));
vi.mock("@/lib/payments/square-terminal", () => ({
  createTerminalCheckout: vi.fn(),
  getTerminalCheckout: vi.fn(),
  cancelTerminalCheckout: vi.fn(),
}));

import { prisma } from "@/test/prisma-mock";
import {
  createTerminalCheckout,
  getTerminalCheckout,
  cancelTerminalCheckout,
} from "@/lib/payments/square-terminal";
import { POST } from "./route";
import { GET, DELETE } from "./[id]/route";

const drink = { id: 1, priceCents: 500, taxRate: "10", stock: 10, category: "drinks" } as never;

function checkoutRequest(body: object) {
  return new Request("http://localhost/api/admin/pos/terminal-checkout", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

const idParams = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });
const pollRequest = new Request("http://localhost/api/admin/pos/terminal-checkout/7") as never;

const pendingRow = {
  id: 7,
  squareCheckoutId: "tc_123",
  status: "pending",
  memberId: null,
  walkIn: null,
  lineItems: [{ itemId: 1, quantity: 2, unitPriceCents: 500 }],
  totalCents: 1100,
  saleId: null,
};

beforeEach(() => {
  vi.mocked(createTerminalCheckout).mockReset();
  vi.mocked(getTerminalCheckout).mockReset();
  vi.mocked(cancelTerminalCheckout).mockReset();
});

describe("POST /api/admin/pos/terminal-checkout", () => {
  it("prices the cart server-side, creates the Square checkout, and stores a pending row", async () => {
    prisma.item.findMany.mockResolvedValue([drink]);
    vi.mocked(createTerminalCheckout).mockResolvedValue({ checkoutId: "tc_123", status: "PENDING", paymentId: null });
    prisma.terminalCheckout.create.mockResolvedValue(pendingRow as never);

    const res = await POST(checkoutRequest({ memberId: null, lineItems: [{ itemId: 1, quantity: 2 }] }));

    expect(res.status).toBe(201);
    expect(createTerminalCheckout).toHaveBeenCalledWith(expect.objectContaining({
      amountCents: 1100, // (500*2) + 10% tax — server-priced
      currency: "usd",
    }));
    expect(prisma.terminalCheckout.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        squareCheckoutId: "tc_123",
        status: "pending",
        totalCents: 1100,
      }),
    }));
    expect((await res.json()).id).toBe(7);
  });

  it("503s when the terminal is not configured", async () => {
    prisma.item.findMany.mockResolvedValue([drink]);
    vi.mocked(createTerminalCheckout).mockResolvedValue(null);

    const res = await POST(checkoutRequest({ memberId: null, lineItems: [{ itemId: 1, quantity: 1 }] }));
    expect(res.status).toBe(503);
    expect(prisma.terminalCheckout.create).not.toHaveBeenCalled();
  });

  it("requires a person for day passes before contacting the device", async () => {
    prisma.item.findMany.mockResolvedValue([
      { id: 2, priceCents: 2000, taxRate: "0", stock: null, category: "day_pass" } as never,
    ]);

    const res = await POST(checkoutRequest({ memberId: null, lineItems: [{ itemId: 2, quantity: 1 }] }));
    expect(res.status).toBe(400);
    expect(createTerminalCheckout).not.toHaveBeenCalled();
  });
});

describe("GET /api/admin/pos/terminal-checkout/[id] — polling", () => {
  it("finalizes a COMPLETED checkout exactly once (idempotent claim)", async () => {
    prisma.terminalCheckout.findUnique.mockResolvedValue(pendingRow as never);
    vi.mocked(getTerminalCheckout).mockResolvedValue({ checkoutId: "tc_123", status: "COMPLETED", paymentId: "sq_pay_9" });

    // First poll claims the pending row…
    prisma.terminalCheckout.updateMany.mockResolvedValueOnce({ count: 1 } as never);
    prisma.item.findMany.mockResolvedValue([]); // no day passes in cart
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: typeof prisma) => unknown) => fn(prisma)
    );
    prisma.sale.create.mockResolvedValue({ id: 31, totalCents: 1100 } as never);
    prisma.item.updateMany.mockResolvedValue({ count: 1 } as never);
    prisma.terminalCheckout.update.mockResolvedValue({} as never);
    prisma.terminalCheckout.findUniqueOrThrow.mockResolvedValue({ ...pendingRow, status: "completed", saleId: 31 } as never);
    prisma.sale.findUnique.mockResolvedValue({
      id: 31, totalCents: 1100, lineItems: [{ item: { category: "drinks" } }], member: null,
    } as never);

    const res = await GET(pollRequest, idParams(7));
    const data = await res.json();
    expect(data.status).toBe("completed");
    expect(data.sale.id).toBe(31);
    expect(prisma.sale.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        paymentMethodType: "square_terminal",
        squarePaymentId: "sq_pay_9",
      }),
    }));

    // …a second concurrent finalize loses the claim and records nothing
    prisma.sale.create.mockClear();
    prisma.terminalCheckout.findUnique.mockResolvedValue(pendingRow as never);
    prisma.terminalCheckout.updateMany.mockResolvedValueOnce({ count: 0 } as never);
    await GET(pollRequest, idParams(7));
    expect(prisma.sale.create).not.toHaveBeenCalled();
  });

  it("marks a CANCELED checkout without recording a sale", async () => {
    prisma.terminalCheckout.findUnique.mockResolvedValue(pendingRow as never);
    vi.mocked(getTerminalCheckout).mockResolvedValue({ checkoutId: "tc_123", status: "CANCELED", paymentId: null });
    prisma.terminalCheckout.updateMany.mockResolvedValue({ count: 1 } as never);
    prisma.terminalCheckout.findUniqueOrThrow.mockResolvedValue({ ...pendingRow, status: "canceled" } as never);

    const res = await GET(pollRequest, idParams(7));
    expect((await res.json()).status).toBe("canceled");
    expect(prisma.sale.create).not.toHaveBeenCalled();
  });

  it("keeps reporting pending on transient Square errors", async () => {
    prisma.terminalCheckout.findUnique.mockResolvedValue(pendingRow as never);
    vi.mocked(getTerminalCheckout).mockRejectedValue(new Error("timeout"));

    const res = await GET(pollRequest, idParams(7));
    expect((await res.json()).status).toBe("pending");
  });
});

describe("DELETE /api/admin/pos/terminal-checkout/[id]", () => {
  it("cancels the device checkout and marks the row canceled", async () => {
    prisma.terminalCheckout.findUnique.mockResolvedValue(pendingRow as never);
    vi.mocked(cancelTerminalCheckout).mockResolvedValue({ checkoutId: "tc_123", status: "CANCELED", paymentId: null });
    prisma.terminalCheckout.updateMany.mockResolvedValue({ count: 1 } as never);
    prisma.terminalCheckout.findUniqueOrThrow.mockResolvedValue({ ...pendingRow, status: "canceled" } as never);

    const res = await DELETE(pollRequest, idParams(7));
    expect(cancelTerminalCheckout).toHaveBeenCalledWith("tc_123");
    expect((await res.json()).status).toBe("canceled");
  });

  it("does not touch checkouts that already completed", async () => {
    prisma.terminalCheckout.findUnique.mockResolvedValue({ ...pendingRow, status: "completed", saleId: 31 } as never);
    prisma.terminalCheckout.findUniqueOrThrow.mockResolvedValue({ ...pendingRow, status: "completed", saleId: 31 } as never);
    prisma.sale.findUnique.mockResolvedValue({
      id: 31, totalCents: 1100, lineItems: [], member: null,
    } as never);

    await DELETE(pollRequest, idParams(7));
    expect(cancelTerminalCheckout).not.toHaveBeenCalled();
  });
});
