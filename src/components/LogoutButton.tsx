"use client";
import { signOut } from "next-auth/react";

export default function LogoutButton({ className = "text-sm text-gray-400 hover:text-white transition" }: { className?: string }) {
  return (
    <button
      onClick={async () => { await signOut({ redirect: false }); window.location.href = "/login"; }}
      className={className}
    >
      Sign out
    </button>
  );
}
