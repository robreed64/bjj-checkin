import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BELT_STYLES } from "@/lib/belt-data";
import CurriculumBuilder from "./CurriculumBuilder";

type Params = Promise<{ id: string }>;

export default async function CurriculumDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const curriculum = await prisma.curriculum.findUnique({
    where:   { id: Number(id) },
    include: { lessons: { orderBy: [{ weekNumber: "asc" }, { position: "asc" }] } },
  });
  if (!curriculum) notFound();

  const belt = curriculum.beltLevel ? BELT_STYLES[curriculum.beltLevel] : null;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Link href="/admin/curriculum" className="text-sm text-gray-400 hover:text-white transition mb-6 inline-flex items-center gap-1">
        ← Curriculum
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{curriculum.name}</h1>
            {belt ? (
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${belt.bg} ${belt.text}`}>
                {curriculum.beltLevel} belt
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-xs bg-gray-800 text-gray-400">All levels</span>
            )}
            {!curriculum.active && (
              <span className="px-2.5 py-0.5 rounded-full text-xs bg-gray-800 text-gray-500">Inactive</span>
            )}
          </div>
          {curriculum.description && (
            <p className="text-sm text-gray-500 mt-1">{curriculum.description}</p>
          )}
          <p className="text-xs text-gray-600 mt-1">{curriculum.weeks}-week program · {curriculum.lessons.length} lessons</p>
        </div>
      </div>

      <CurriculumBuilder
        curriculumId={curriculum.id}
        weeks={curriculum.weeks}
        initialLessons={curriculum.lessons.map((l) => ({
          id:          l.id,
          title:       l.title,
          weekNumber:  l.weekNumber,
          dayOfWeek:   l.dayOfWeek,
          warmup:      l.warmup,
          techniques:  l.techniques as Technique[],
          notes:       l.notes,
          position:    l.position,
        }))}
      />
    </div>
  );
}

export type Technique = { name: string; description?: string; videoUrl?: string };
