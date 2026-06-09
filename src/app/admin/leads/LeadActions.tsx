"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ConvertButton({ memberId }: { memberId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function convert() {
    setLoading(true);
    await fetch(`/api/admin/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "trial" }),
    });
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={convert}
      disabled={loading}
      className="text-xs px-2.5 py-1 rounded-md bg-green-600/20 hover:bg-green-600/40 text-green-400 font-medium transition disabled:opacity-50"
    >
      {loading ? "…" : "Convert"}
    </button>
  );
}

export function DeleteLeadButton({ memberId, memberName }: { memberId: number; memberName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function del() {
    if (!confirm(`Remove lead "${memberName}"?`)) return;
    setLoading(true);
    await fetch(`/api/admin/members/${memberId}`, { method: "DELETE" });
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={del}
      disabled={loading}
      className="text-xs px-2.5 py-1 rounded-md hover:bg-red-600/20 text-gray-600 hover:text-red-400 font-medium transition disabled:opacity-50"
    >
      {loading ? "…" : "Remove"}
    </button>
  );
}
