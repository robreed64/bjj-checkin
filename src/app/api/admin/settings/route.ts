import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getGymSettings } from "@/lib/gym-settings";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await getGymSettings();
  return NextResponse.json(settings);
}

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const allowed = [
    "gymName", "gymEmail", "gymPhone", "gymAddress", "logoUrl",
    "waiverText", "currency", "currencySymbol", "locale", "timezone",
    "defaultTaxRate", "setupComplete",
  ];
  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) data[key] = body[key];
  }

  if (data.defaultTaxRate !== undefined) {
    const rate = Number(data.defaultTaxRate);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      return NextResponse.json({ error: "Invalid tax rate" }, { status: 400 });
    }
    data.defaultTaxRate = rate;
  }

  const settings = await prisma.gymSettings.upsert({
    where: { id: 1 },
    update: data,
    create: { id: 1, ...data },
  });

  return NextResponse.json(settings);
}
