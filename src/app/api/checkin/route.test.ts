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
} as Member;

describe("POST /api/checkin", () => {
  it("checks in by QR token", async () => {
    prisma.member.findUnique.mockResolvedValue(member);
    prisma.attendance.create.mockResolvedValue({ id: 99 } as never);

    const res = await POST(checkinRequest({ token: "abc123" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      success: true,
      attendanceId: 99,
      member: { name: "Jane Doe", beltRank: "blue" },
    });
    expect(prisma.member.findUnique).toHaveBeenCalledWith({ where: { checkinToken: "abc123" } });
  });

  it("checks in by member id when no token given", async () => {
    prisma.member.findUnique.mockResolvedValue(member);
    prisma.attendance.create.mockResolvedValue({ id: 100 } as never);

    const res = await POST(checkinRequest({ memberId: "5" }));

    expect(res.status).toBe(200);
    expect(prisma.member.findUnique).toHaveBeenCalledWith({ where: { id: 5 } });
  });

  it("404s for unknown member", async () => {
    prisma.member.findUnique.mockResolvedValue(null);

    const res = await POST(checkinRequest({ memberId: 999 }));

    expect(res.status).toBe(404);
    expect(prisma.attendance.create).not.toHaveBeenCalled();
  });

  it("403s for canceled membership", async () => {
    prisma.member.findUnique.mockResolvedValue({ ...member, status: "canceled" } as never);

    const res = await POST(checkinRequest({ memberId: 5 }));

    expect(res.status).toBe(403);
    expect(prisma.attendance.create).not.toHaveBeenCalled();
  });

  it("marks an existing booking attended when checking into a class", async () => {
    prisma.member.findUnique.mockResolvedValue(member);
    prisma.attendance.create.mockResolvedValue({ id: 101 } as never);
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
    prisma.booking.findFirst.mockResolvedValue(null);

    await POST(checkinRequest({ memberId: 5, classId: 12 }));

    expect(prisma.booking.create).toHaveBeenCalledWith({
      data: { memberId: 5, classId: 12, status: "attended" },
    });
  });
});
