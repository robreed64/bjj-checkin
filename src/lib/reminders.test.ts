import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => import("@/test/prisma-mock"));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/web-push", () => ({ sendPushToUser: vi.fn() }));

import { prisma } from "@/test/prisma-mock";
import { sendEmail } from "@/lib/email";
import { sendPushToUser } from "@/lib/web-push";
import { sendClassReminders } from "./reminders";

const now = new Date("2026-06-12T08:00:00Z");
const classStart = new Date("2026-06-12T18:00:00Z");

function booking(overrides: object = {}) {
  return {
    id: 1,
    class: { name: "BJJ Fundamentals", startTime: classStart },
    member: { id: 5, name: "Jane", email: "jane@x.com", user: { id: 30 } },
    ...overrides,
  };
}

describe("sendClassReminders", () => {
  it("sends push when the member has a portal account with subscriptions", async () => {
    prisma.booking.findMany.mockResolvedValue([booking()] as never);
    vi.mocked(sendPushToUser).mockResolvedValue(1);
    prisma.booking.update.mockResolvedValue({} as never);

    const result = await sendClassReminders(now);

    expect(result).toEqual({ sent: 1, failed: 0 });
    expect(sendPushToUser).toHaveBeenCalledWith(30, expect.objectContaining({ title: "Class reminder" }));
    expect(sendEmail).not.toHaveBeenCalled();
    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { reminderSentAt: now },
    });
  });

  it("falls back to email when push delivers to zero subscriptions", async () => {
    prisma.booking.findMany.mockResolvedValue([booking()] as never);
    vi.mocked(sendPushToUser).mockResolvedValue(0);
    prisma.booking.update.mockResolvedValue({} as never);

    await sendClassReminders(now);

    expect(sendEmail).toHaveBeenCalledWith(
      "jane@x.com",
      "Reminder: BJJ Fundamentals",
      expect.stringContaining("BJJ Fundamentals")
    );
  });

  it("emails directly when the member has no portal account", async () => {
    prisma.booking.findMany.mockResolvedValue([
      booking({ member: { id: 5, name: "Jane", email: "jane@x.com", user: null } }),
    ] as never);
    prisma.booking.update.mockResolvedValue({} as never);

    await sendClassReminders(now);

    expect(sendPushToUser).not.toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalled();
  });

  it("stamps reminderSentAt even when delivery throws", async () => {
    prisma.booking.findMany.mockResolvedValue([booking()] as never);
    vi.mocked(sendPushToUser).mockRejectedValue(new Error("push down"));
    prisma.booking.update.mockResolvedValue({} as never);

    const result = await sendClassReminders(now);

    expect(result).toEqual({ sent: 0, failed: 1 });
    expect(prisma.booking.update).toHaveBeenCalledOnce();
  });

  it("queries only unsent booked bookings inside the window", async () => {
    prisma.booking.findMany.mockResolvedValue([]);

    await sendClassReminders(now, 24);

    const where = prisma.booking.findMany.mock.calls[0][0]?.where as Record<string, unknown>;
    expect(where.status).toBe("booked");
    expect(where.reminderSentAt).toBeNull();
    expect(where.class).toEqual({
      startTime: { gt: now, lte: new Date(now.getTime() + 24 * 60 * 60 * 1000) },
    });
  });
});
