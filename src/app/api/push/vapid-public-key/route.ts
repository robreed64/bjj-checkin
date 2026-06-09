import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/web-push";

export async function GET() {
  const publicKey = await getVapidPublicKey();
  return NextResponse.json({ publicKey });
}
