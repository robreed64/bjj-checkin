import { NextResponse } from "next/server";
import { getGymSettings } from "@/lib/gym-settings";

export async function GET() {
  const settings = await getGymSettings();
  return NextResponse.json({ gymName: settings.gymName });
}
