import { auth } from "@/auth";
import { NextResponse } from "next/server";

type MemberOk  = { memberId: number; error?: undefined };
type MemberErr = { error: NextResponse; memberId?: undefined };

export async function requireMember(): Promise<MemberOk | MemberErr> {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const role = (session.user as { role?: string }).role;
  if (role !== "member" && role !== "parent") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  const memberId = (session.user as { memberId?: number }).memberId;
  if (!memberId) {
    return { error: NextResponse.json({ error: "No member linked" }, { status: 403 }) };
  }
  return { memberId };
}
