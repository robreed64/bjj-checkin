"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-xs text-gray-500 hover:text-red-400 transition px-2 py-1 rounded hover:bg-gray-800"
    >
      Sign out
    </button>
  );
}
