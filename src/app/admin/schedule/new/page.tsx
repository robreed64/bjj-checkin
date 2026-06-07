import ClassForm from "../ClassForm";

type SearchParams = Promise<{ date?: string; time?: string }>;

export default async function NewClassPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Add Class</h1>
      <ClassForm initialValues={{ date: sp.date, startTime: sp.time }} />
    </div>
  );
}
