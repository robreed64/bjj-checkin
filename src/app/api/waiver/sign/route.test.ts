import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => import("@/test/prisma-mock"));

import { prisma } from "@/test/prisma-mock";
import { POST } from "./route";

function signRequest(body: object) {
  return new NextRequest("http://localhost/api/waiver/sign", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/waiver/sign", () => {
  it("stamps waiverSignedAt when not yet signed", async () => {
    prisma.member.findUnique.mockResolvedValue({ id: 5, waiverSignedAt: null } as never);
    prisma.member.update.mockResolvedValue({} as never);

    const res = await POST(signRequest({ memberId: 5 }));

    expect(res.status).toBe(200);
    expect(prisma.member.update).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { waiverSignedAt: expect.any(Date) },
    });
  });

  it("resolves by checkin token", async () => {
    prisma.member.findUnique.mockResolvedValue({ id: 7, waiverSignedAt: null } as never);
    prisma.member.update.mockResolvedValue({} as never);

    await POST(signRequest({ token: "tok123" }));

    expect(prisma.member.findUnique).toHaveBeenCalledWith({ where: { checkinToken: "tok123" } });
  });

  it("no-ops when the waiver is already signed", async () => {
    prisma.member.findUnique.mockResolvedValue({ id: 5, waiverSignedAt: new Date("2025-01-01") } as never);

    const res = await POST(signRequest({ memberId: 5 }));
    const data = await res.json();

    expect(data.alreadySigned).toBe(true);
    expect(prisma.member.update).not.toHaveBeenCalled();
  });

  it("404s for unknown member", async () => {
    prisma.member.findUnique.mockResolvedValue(null);

    const res = await POST(signRequest({ memberId: 999 }));

    expect(res.status).toBe(404);
  });
});
