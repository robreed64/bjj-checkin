import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireAuth } from "@/lib/require-auth";

// POST — create a portal (parent) user account for a member
export async function POST(req: Request) {
  const { error } = await requireAuth();
  if (error) return error;

  const { memberId, email, password } = await req.json();

  if (!memberId || !email || !password) {
    return NextResponse.json({ error: "memberId, email, and password are required" }, { status: 400 });
  }

  const member = await prisma.member.findUnique({ where: { id: Number(memberId) } });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email, name: member.name, passwordHash, role: "parent", memberId: member.id,
      mustChangePassword: true, // staff-chosen password is good for one login
    },
  });

  return NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role }, { status: 201 });
}
