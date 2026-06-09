import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { put } from "@vercel/blob";

const MAX_BYTES = 200 * 1024 * 1024; // 200 MB

export async function POST(req: NextRequest) {
  const { error } = await requireAuth("curriculum");
  if (error) return error;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Video storage not configured (BLOB_READ_WRITE_TOKEN missing)" },
      { status: 503 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Video must be under 200 MB" }, { status: 413 });
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp4";
  const filename = `curriculum-videos/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const blob = await put(filename, file.stream(), {
    access: "public",
    contentType: file.type || "video/mp4",
  });

  return NextResponse.json({ videoUrl: blob.url });
}
