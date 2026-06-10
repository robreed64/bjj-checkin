import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireAuth } from "@/lib/require-auth";

type Params = Promise<{ id: string }>;

export async function POST(req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (isNaN(memberId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const { email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });

  const member = await prisma.member.findUnique({ where: { id: memberId } });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // If the email already belongs to this member's own account, return it as success
    if (existing.memberId === memberId) {
      return NextResponse.json({ id: existing.id, email: existing.email }, { status: 200 });
    }
    return NextResponse.json({ error: "That email is already used by another account. Use a different email." }, { status: 409 });
  }

  const existingLinked = await prisma.user.findFirst({ where: { memberId } });
  if (existingLinked) return NextResponse.json({ error: `This member already has a portal account (${existingLinked.email})` }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      name:         member.name,
      passwordHash,
      role:         "member",
      memberId,
    },
  });

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}

export async function PATCH(req: Request, { params }: { params: Params }) {
  const { error } = await requireAuth("members");
  if (error) return error;

  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (isNaN(memberId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  const { password } = await req.json();
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({ where: { memberId, role: "member" } });
  if (!user) return NextResponse.json({ error: "No portal account found" }, { status: 404 });

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Params }) {
  const { id } = await params;
  const memberId = parseInt(id, 10);
  if (isNaN(memberId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

  await prisma.user.deleteMany({ where: { memberId, role: "member" } });
  return new NextResponse(null, { status: 204 });
}
