import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { toCSV, csvResponse } from "@/lib/csv";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const members = await prisma.member.findMany({
    orderBy: { name: "asc" },
    select: {
      name: true,
      email: true,
      phone: true,
      status: true,
      beltRank: true,
      beltStripes: true,
      ageGroup: true,
      trainingType: true,
      waiverSignedAt: true,
      createdAt: true,
    },
  });

  const headers = ["Name", "Email", "Phone", "Status", "Belt", "Stripes", "Age Group", "Training", "Waiver Signed", "Join Date"];
  const rows = members.map((m) => [
    m.name,
    m.email,
    m.phone,
    m.status,
    m.beltRank,
    m.beltStripes,
    m.ageGroup,
    m.trainingType,
    m.waiverSignedAt ? m.waiverSignedAt.toISOString().split("T")[0] : "",
    m.createdAt.toISOString().split("T")[0],
  ]);

  const date = new Date().toISOString().split("T")[0];
  return csvResponse(`members-${date}.csv`, toCSV(headers, rows));
}
