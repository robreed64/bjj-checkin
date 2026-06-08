import Link from "next/link";
import { prisma } from "@/lib/prisma";
import FamiliesSetupClient from "./FamiliesSetupClient";

export default async function SetupFamiliesPage() {
  const families = await prisma.member.findMany({
    where: { children: { some: {} } },
    include: {
      children: {
        select: { id: true, name: true, ageGroup: true, beltRank: true, _count: { select: { attendance: true } } },
      },
      user: { select: { id: true, email: true, role: true } },
    },
    orderBy: { name: "asc" },
  });

  const serialized = families.map(f => ({
    id: f.id,
    name: f.name,
    beltRank: f.beltRank,
    portalEmail: f.user?.role === "parent" ? f.user.email : null,
    children: f.children.map(c => ({ id: c.id, name: c.name, ageGroup: c.ageGroup, beltRank: c.beltRank, attendanceCount: c._count.attendance })),
  }));

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-6">
        <Link href="/admin/setup" className="text-sm text-amber-500 hover:text-amber-300 transition">← Configure</Link>
        <h1 className="text-2xl font-bold mt-2">Families</h1>
        <p className="text-gray-400 text-sm mt-1">Manage parent-child links and portal accounts. To link children to a parent, use the member&apos;s detail page.</p>
      </div>
      <FamiliesSetupClient families={serialized} />
    </div>
  );
}
