import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => import("@/test/prisma-mock"));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/web-push", () => ({ sendPushToUser: vi.fn() }));

import { prisma } from "@/test/prisma-mock";
import { sendEmail } from "@/lib/email";
import { sendPushToUser } from "@/lib/web-push";
import { promoteWaitlist } from "./waitlist";

const cls = { capacity: 10, name: "No-Gi", startTime: new Date("2026-06-15T18:00:00Z") };

describe("promoteWaitlist", () => {
  it("promotes the oldest waitlisted booking and notifies the member", async () => {
    prisma.class.findUnique.mockResolvedValue(cls as never);
    prisma.booking.count.mockResolvedValue(9); // one seat free
    prisma.booking.findFirst.mockResolvedValue({
      id: 77,
      member: { id: 5, name: "Jane", email: "jane@x.com", user: { id: 30 } },
    } as never);
    prisma.booking.update.mockResolvedValue({ id: 77, status: "booked" } as never);
    vi.mocked(sendPushToUser).mockResolvedValue(1);

    const promoted = await promoteWaitlist(12);

    expect(promoted).toEqual({ id: 77, status: "booked" });
    expect(prisma.booking.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { classId: 12, status: "waitlisted" },
      orderBy: { createdAt: "asc" },
    }));
    expect(sendPushToUser).toHaveBeenCalledWith(30, expect.objectContaining({ title: "You're off the waitlist!" }));
  });

  it("does nothing when the class is still full", async () => {
    prisma.class.findUnique.mockResolvedValue(cls as never);
    prisma.booking.count.mockResolvedValue(10);

    expect(await promoteWaitlist(12)).toBeNull();
    expect(prisma.booking.update).not.toHaveBeenCalled();
  });

  it("does nothing for classes without capacity limits", async () => {
    prisma.class.findUnique.mockResolvedValue({ ...cls, capacity: null } as never);

    expect(await promoteWaitlist(12)).toBeNull();
    expect(prisma.booking.count).not.toHaveBeenCalled();
  });

  it("does nothing when no one is waitlisted", async () => {
    prisma.class.findUnique.mockResolvedValue(cls as never);
    prisma.booking.count.mockResolvedValue(5);
    prisma.booking.findFirst.mockResolvedValue(null);

    expect(await promoteWaitlist(12)).toBeNull();
  });

  it("still promotes when notification delivery fails", async () => {
    prisma.class.findUnique.mockResolvedValue(cls as never);
    prisma.booking.count.mockResolvedValue(9);
    prisma.booking.findFirst.mockResolvedValue({
      id: 77,
      member: { id: 5, name: "Jane", email: "jane@x.com", user: null },
    } as never);
    prisma.booking.update.mockResolvedValue({ id: 77, status: "booked" } as never);
    vi.mocked(sendEmail).mockRejectedValue(new Error("brevo down"));

    const promoted = await promoteWaitlist(12);

    expect(promoted).toEqual({ id: 77, status: "booked" });
  });
});
