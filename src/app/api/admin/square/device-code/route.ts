import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { createDeviceCode, getDeviceCode } from "@/lib/payments/square-terminal";

// Pairs a Square Terminal: POST mints a device code the staff types on the
// Terminal; the settings page polls GET until Square reports PAIRED, at which
// point the device id is stored for POS checkouts.
export async function POST() {
  const { error } = await requireAuth("settings");
  if (error) return error;

  try {
    const code = await createDeviceCode();
    if (!code) return NextResponse.json({ error: "Square is not configured" }, { status: 503 });
    return NextResponse.json(code, { status: 201 });
  } catch (err) {
    console.error("Device code creation failed:", err);
    return NextResponse.json({ error: "Could not create a pairing code" }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  const { error } = await requireAuth("settings");
  if (error) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  try {
    const code = await getDeviceCode(id);
    if (!code) return NextResponse.json({ error: "Square is not configured" }, { status: 503 });

    if (code.status === "PAIRED" && code.deviceId) {
      await prisma.gymSettings.update({
        where: { id: 1 },
        data: { squareTerminalDeviceId: code.deviceId },
      });
    }
    return NextResponse.json(code);
  } catch (err) {
    console.error("Device code poll failed:", err);
    return NextResponse.json({ error: "Could not check pairing status" }, { status: 502 });
  }
}
