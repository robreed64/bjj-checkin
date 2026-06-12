import { beforeEach } from "vitest";
import { mockDeep, mockReset } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

// Shared deep mock of the prisma singleton. Test files activate it with:
//   vi.mock("@/lib/prisma", () => import("@/test/prisma-mock"));
export const prisma = mockDeep<PrismaClient>();

beforeEach(() => {
  mockReset(prisma);
});
