import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => import("@/test/prisma-mock"));
vi.mock("@/lib/require-member", () => ({
  requireMember: vi.fn().mockResolvedValue({ memberId: 5 }),
}));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/web-push", () => ({ sendPushToUser: vi.fn() }));

import { prisma } from "@/test/prisma-mock";
import { POST } from "./route";

function bookRequest(body: object) {
  return new NextRequest("http://localhost/api/member/bookings", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/member/bookings", () => {
  it("books normally when the class has space", async () => {
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.class.findUnique.mockResolvedValue({ capacity: 10 } as never);
    prisma.booking.count.mockResolvedValue(4);
    prisma.booking.create.mockResolvedValue({ id: 1, status: "booked" } as never);

    const res = await POST(bookRequest({ classId: 12 }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.status).toBe("booked");
    expect(data.waitlisted).toBeUndefined();
  });

  it("books normally when the class has no capacity limit", async () => {
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.class.findUnique.mockResolvedValue({ capacity: null } as never);
    prisma.booking.create.mockResolvedValue({ id: 1, status: "booked" } as never);

    const res = await POST(bookRequest({ classId: 12 }));

    expect(res.status).toBe(201);
    expect(prisma.booking.count).not.toHaveBeenCalled();
  });

  it("waitlists with a position when the class is full", async () => {
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.class.findUnique.mockResolvedValue({ capacity: 10 } as never);
    const createdAt = new Date();
    prisma.booking.count
      .mockResolvedValueOnce(10) // active bookings → full
      .mockResolvedValueOnce(2); // waitlist position
    prisma.booking.create.mockResolvedValue({ id: 9, status: "waitlisted", createdAt } as never);

    const res = await POST(bookRequest({ classId: 12 }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.waitlisted).toBe(true);
    expect(data.position).toBe(2);
    expect(prisma.booking.create).toHaveBeenCalledWith({
      data: { memberId: 5, classId: 12, status: "waitlisted" },
    });
  });

  it("409s when already booked or waitlisted", async () => {
    prisma.booking.findFirst.mockResolvedValue({ id: 3, status: "waitlisted" } as never);

    const res = await POST(bookRequest({ classId: 12 }));

    expect(res.status).toBe(409);
    expect(prisma.booking.create).not.toHaveBeenCalled();
  });

  it("404s for unknown class", async () => {
    prisma.booking.findFirst.mockResolvedValue(null);
    prisma.class.findUnique.mockResolvedValue(null);

    const res = await POST(bookRequest({ classId: 999 }));

    expect(res.status).toBe(404);
  });
});
