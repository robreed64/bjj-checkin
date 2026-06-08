import Link from "next/link";
import { type ReactNode } from "react";
import { auth } from "@/auth";
import { getGymSettings } from "@/lib/gym-settings";
import { navForRole } from "@/lib/permissions";
import LogoutButton from "./LogoutButton";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const [session, settings] = await Promise.all([auth(), getGymSettings()]);
  const user = session?.user;
  const role = (user as { role?: string } | undefined)?.role;
  const nav = navForRole(role);

  return (
    <div className="flex min-h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="px-5 py-6 border-b border-gray-800">
          <span className="text-lg font-black tracking-tight">{settings.gymName}</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition"
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        {user && (
          <div className="px-4 py-4 border-t border-gray-800">
            <p className="text-xs font-medium text-gray-300 truncate">{user.name}</p>
            <p className="text-xs text-gray-600 truncate capitalize">{role ?? "staff"}</p>
            {role === "admin" && (
              <Link href="/admin/settings" className="block text-xs text-gray-500 hover:text-gray-300 transition mt-1 mb-2">
                Settings
              </Link>
            )}
            <LogoutButton />
          </div>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
