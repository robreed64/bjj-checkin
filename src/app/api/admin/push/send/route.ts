import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { sendPushToAll, sendPushToUser } from "@/lib/web-push";

export async function POST(req: Request) {
  const { error } = await requireAuth("marketing");
  if (error) return error;

  const { title, body, url, userId } = await req.json();
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: "Title and body are required" }, { status: 400 });
  }

  const payload = { title: title.trim(), body: body.trim(), url: url ?? "/" };

  const sent = userId
    ? await sendPushToUser(Number(userId), payload)
    : await sendPushToAll(payload);

  return NextResponse.json({ sent });
}
