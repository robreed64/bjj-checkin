"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeletePlanButton({ planId, planName }: { planId: number; planName: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete plan "${planName}"? This cannot be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/plans/${planId}`, { method: "DELETE" });
    setDeleting(false);
    if (res.ok) router.refresh();
    else {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Failed to delete plan");
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="text-xs text-red-500 hover:text-red-300 transition disabled:opacity-40 ml-3"
    >
      {deleting ? "…" : "Delete"}
    </button>
  );
}
