import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import RosterClient from "./RosterClient";

type Params = Promise<{ id: string }>;

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default async function RosterPage({ params }: { params: Params }) {
  const { id } = await params;
  const classId = parseInt(id, 10);

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      program: true,
      bookings: {
        include: { member: { select: { id: true, name: true, beltRank: true, photoUrl: true, status: true } } },
        orderBy: { createdAt: "asc" },
      },
      attendance: {
        include: { member: { select: { id: true, name: true, beltRank: true, photoUrl: true, status: true } } },
        orderBy: { timestamp: "asc" },
      },
    },
  });

  if (!cls) notFound();

  const serialized = {
    bookings: cls.bookings,
    attendance: cls.attendance.map((a) => ({
      ...a,
      timestamp: a.timestamp.toISOString(),
    })),
  };

  return (
    <div className="p-8 max-w-3xl">
      {/* Back link */}
      <Link
        href={`/admin/schedule?week=${cls.startTime.toLocaleDateString("en-CA")}`}
        className="text-sm text-gray-400 hover:text-white transition mb-5 inline-flex items-center gap-1"
      >
        ← Schedule
      </Link>

      {/* Header */}
      <div className="mt-4 mb-6">
        <h1 className="text-2xl font-bold text-white">{cls.name}</h1>
        <div className="flex items-center gap-3 mt-1 text-sm text-gray-400 flex-wrap">
          <span>{cls.startTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
          <span>·</span>
          <span>{formatTime(cls.startTime)} – {formatTime(cls.endTime)}</span>
          {cls.instructorName && <><span>·</span><span>{cls.instructorName}</span></>}
          {cls.program && <><span>·</span><span className="capitalize">{cls.program.type}</span></>}
        </div>
      </div>

      <RosterClient
        classId={classId}
        bookings={serialized.bookings}
        attendance={serialized.attendance}
        capacity={cls.capacity}
      />
    </div>
  );
}
