import { NextResponse } from "next/server";
import { runAllActiveWorkflows } from "@/lib/marketing-triggers";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Invoked daily by Vercel Cron (see vercel.json). Vercel sends
// `Authorization: Bearer $CRON_SECRET` when the env var is set on the project.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await runAllActiveWorkflows();
  const sent    = results.reduce((sum, r) => sum + r.sent, 0);
  const skipped = results.reduce((sum, r) => sum + r.skipped, 0);

  return NextResponse.json({ sent, skipped, workflows: results });
}
