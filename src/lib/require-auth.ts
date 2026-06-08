import { type Session } from "next-auth";
import { auth } from "@/auth";
import { can, type Feature } from "./permissions";
import { NextResponse } from "next/server";

type AuthOk  = { session: Session; error?: undefined };
type AuthErr = { error: NextResponse; session?: undefined };

export async function requireAuth(feature?: Feature): Promise<AuthOk | AuthErr> {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const role = (session.user as { role?: string }).role;
  if (feature && !can(role, feature)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}
