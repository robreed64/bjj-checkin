import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { toCSV, csvResponse } from "@/lib/csv";

export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const records = await prisma.attendance.findMany({
    orderBy: { timestamp: "desc" },
    include: { member: { select: { name: true } } },
  });

  const headers = ["Member", "Date", "Time"];
  const rows = records.map((a) => {
    const ts = new Date(a.timestamp);
    return [
      a.member.name,
      ts.toISOString().split("T")[0],
      ts.toTimeString().slice(0, 5),
    ];
  });

  const date = new Date().toISOString().split("T")[0];
  return csvResponse(`attendance-${date}.csv`, toCSV(headers, rows));
}
