import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const programs = await prisma.program.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(programs);
}

export async function POST(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const { name, type, description } = await req.json();
  if (!name || !type) return NextResponse.json({ error: "name and type required" }, { status: 400 });
  const program = await prisma.program.create({ data: { name, type, description } });
  return NextResponse.json(program, { status: 201 });
}
