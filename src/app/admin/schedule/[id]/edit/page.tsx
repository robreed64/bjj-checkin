import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ClassForm from "../../ClassForm";

type Params = Promise<{ id: string }>;

export default async function EditClassPage({ params }: { params: Params }) {
  const { id } = await params;
  const cls = await prisma.class.findUnique({ where: { id: parseInt(id, 10) } });
  if (!cls) notFound();

  const initialValues = {
    name:           cls.name,
    programId:      cls.programId ? String(cls.programId) : "",
    date:           cls.startTime.toLocaleDateString("en-CA"),
    startTime:      cls.startTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    endTime:        cls.endTime.toLocaleTimeString("en-GB",   { hour: "2-digit", minute: "2-digit" }),
    instructorName: cls.instructorName ?? "",
    capacity:       cls.capacity ? String(cls.capacity) : "",
    recurrenceRule: cls.recurrenceRule ?? "",
  };

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Edit Class</h1>
      <ClassForm initialValues={initialValues} classId={cls.id} />
    </div>
  );
}
