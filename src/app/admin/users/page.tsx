import Link from "next/link";
import { prisma } from "@/lib/prisma";

const ROLE_LABEL: Record<string, string> = {
  admin:      "Admin",
  manager:    "Manager",
  front_desk: "Front Desk",
  staff:      "Staff",
};

const ROLE_COLOR: Record<string, string> = {
  admin:      "bg-purple-900/40 text-purple-300",
  manager:    "bg-blue-900/40 text-blue-300",
  front_desk: "bg-green-900/40 text-green-300",
  staff:      "bg-gray-800 text-gray-400",
};

export default async function UsersPage() {
  const users = await prisma.user.findMany({
    where: { role: { in: ["admin", "manager", "front_desk", "staff"] } },
    select: { id: true, email: true, name: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Staff Accounts</h1>
          <p className="text-gray-400 text-sm mt-0.5">{users.length} account{users.length !== 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/admin/users/new"
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold transition"
        >
          + Add User
        </Link>
      </div>

      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/60 text-gray-400 text-left">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Since</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-900/40 transition">
                <td className="px-4 py-3 font-medium text-white">{u.name}</td>
                <td className="px-4 py-3 text-gray-400">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLOR[u.role] ?? "bg-gray-800 text-gray-400"}`}>
                    {ROLE_LABEL[u.role] ?? u.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/users/${u.id}`}
                    className="text-xs text-gray-400 hover:text-white transition"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-600">No staff accounts yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
