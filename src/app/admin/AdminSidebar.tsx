"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";

type NavItem = { href: string; label: string; icon: string };

type Props = {
  nav: NavItem[];
  gymName: string;
  userName?: string | null;
  role?: string;
};

export default function AdminSidebar({ nav, gymName, userName, role }: Props) {
  const pathname = usePathname();
  const inSetup = pathname.startsWith("/admin/setup");

  return (
    <aside className={`w-56 flex-shrink-0 flex flex-col transition-colors ${inSetup ? "bg-amber-950/40 border-r border-amber-800/40" : "bg-gray-900 border-r border-gray-800"}`}>
      {/* Header */}
      <div className={`px-5 py-6 border-b ${inSetup ? "border-amber-800/40" : "border-gray-800"}`}>
        <span className="text-lg font-black tracking-tight block">{gymName}</span>
        {inSetup && (
          <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-900/40 px-2 py-0.5 rounded-full">
            ⚙ CONFIGURE
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map((item) => {
          const segment = item.href.startsWith("/admin/")
          ? item.href.slice("/admin/".length)
          : item.href.slice(1);
        const href = inSetup ? `/admin/setup/${segment}` : item.href;
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={item.href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive
                  ? inSetup
                    ? "bg-amber-900/50 text-amber-200"
                    : "bg-gray-800 text-white"
                  : inSetup
                  ? "text-amber-200/70 hover:bg-amber-900/30 hover:text-amber-100"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span>{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {inSetup && <span className="text-amber-500/60 text-xs">⚙</span>}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`px-4 py-4 border-t ${inSetup ? "border-amber-800/40" : "border-gray-800"}`}>
        {userName && (
          <>
            <p className="text-xs font-medium text-gray-300 truncate">{userName}</p>
            <p className="text-xs text-gray-600 truncate capitalize">{role ?? "staff"}</p>
          </>
        )}

        {inSetup ? (
          <Link
            href="/admin/members"
            className="block text-xs text-amber-400 hover:text-amber-200 transition mt-2 mb-2 font-medium"
          >
            ← Exit Setup
          </Link>
        ) : (
          role === "admin" && (
            <>
              <Link href="/admin/setup" className="block text-xs text-gray-500 hover:text-gray-300 transition mt-1 mb-1">
                Setup
              </Link>
              <Link href="/admin/settings" className="block text-xs text-gray-500 hover:text-gray-300 transition mb-2">
                Settings
              </Link>
            </>
          )
        )}
        <LogoutButton />
      </div>
    </aside>
  );
}
