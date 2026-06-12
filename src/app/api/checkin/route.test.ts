import { describe, it, expect } from "vitest";
import { vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => import("@/test/prisma-mock"));

import { prisma } from "@/test/prisma-mock";
import { POST } from "./route";

function checkinRequest(body: object) {
  return new NextRequest("http://localhost/api/checkin", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

import type { Member } from "@prisma/client";

const member = {
  id: 5,
  name: "Jane Doe",
  beltRank: "blue",
  status: "active",
  waiverSignedAt: new Date("2026-01-01"),
} as Member;

describe("POST /api/checkin", () => {
  it("checks in by QR token", async () => {
    prisma.member.findUnique.mockResolvedValue(member);
    prisma.attendance.create.mockResolvedValue({ id: 99 } as never);
    prisma.attendance.count.mockResolvedValue(42);

    const res = await POST(checkinRequest({ token: "abc123" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      attendanceId: 99,
      totalClasses: 42,
      milestone: null,
      member: { name: "Jane Doe", beltRank: "blue" },
    });
    expect(prisma.member.findUnique).toHaveBeenCalledWith({ where: { checkinToken: "abc123" } });
  });

  it("checks in by member id when no token given", async () => {
    prisma.member.findUnique.mockResolvedValue(member);
    prisma.attendance.create.mockResolvedValue({ id: 100 } as never);
    prisma.attendance.count.mockResolvedValue(3);

    const res = await POST(checkinRequest({ memberId: "5" }));

    expect(res.status).toBe(200);
    expect(prisma.member.findUnique).toHaveBeenCalledWith({ where: { id: 5 } });
  });

  it("returns the milestone when the new total hits a threshold", async () => {
    prisma.member.findUnique.mockResolvedValue(member);
    prisma.attendance.create.mockResolvedValue({ id: 101 } as never);
    prisma.attendance.count.mockResolvedValue(100);

    const res = await POST(checkinRequest({ memberId: 5 }));
    const data = await res.json();

    expect(data.milestone).toBe(100);
    expect(data.totalClasses).toBe(100);
  });

  it("requires a waiver before check-in when none is signed", async () => {
    prisma.member.findUnique.mockResolvedValue({ ...member, waiverSignedAt: null } as Member);

    const res = await POST(checkinRequest({ memberId: 5 }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.waiverRequired).toBe(true);
    expect(data.member).toEqual({ id: 5, name: "Jane Doe", beltRank: "blue" });
    expect(prisma.attendance.create).not.toHaveBeenCalled();
  });

  it("404s for unknown member", async () => {
    prisma.member.findUnique.mockResolvedValue(null);

    const res = await POST(checkinRequest({ memberId: 999 }));

    expect(res.status).toBe(404);
    expect(prisma.attendance.create).not.toHaveBeenCalled();
  });

  it("403s for canceled membership", async () => {
    prisma.member.findUnique.mockResolvedValue({ ...member, status: "canceled" } as Member);

    const res = await POST(checkinRequest({ memberId: 5 }));

    expect(res.status).toBe(403);
    expect(prisma.attendance.create).not.toHaveBeenCalled();
  });

  it("marks an existing booking attended when checking into a class", async () => {
    prisma.member.findUnique.mockResolvedValue(member);
    prisma.attendance.create.mockResolvedValue({ id: 101 } as never);
    prisma.attendance.count.mockResolvedValue(7);
    prisma.booking.findFirst.mockResolvedValue({ id: 42 } as never);

    await POST(checkinRequest({ memberId: 5, classId: 12 }));

    expect(prisma.booking.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: { status: "attended" },
    });
    expect(prisma.booking.create).not.toHaveBeenCalled();
  });

  it("creates an attended booking when none exists for the class", async () => {
    prisma.member.findUnique.mockResolvedValue(member);
    prisma.attendance.create.mockResolvedValue({ id: 102 } as never);
    prisma.attendance.count.mockResolvedValue(8);
    prisma.booking.findFirst.mockResolvedValue(null);

    await POST(checkinRequest({ memberId: 5, classId: 12 }));

    expect(prisma.booking.create).toHaveBeenCalledWith({
      data: { memberId: 5, classId: 12, status: "attended" },
    });
  });
});
