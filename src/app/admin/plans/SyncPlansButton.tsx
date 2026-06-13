"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Backfills provider refs for plans missing them (e.g. after switching
// payment providers). Idempotent server-side.
export default function SyncPlansButton({ providerLabel }: { providerLabel: string }) {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const sync = async () => {
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/plans/sync", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setStatus("done");
        setMessage(
          data.failures?.length
            ? `Synced ${data.synced}, failed: ${data.failures.join(", ")}`
            : `Synced ${data.synced} plan${data.synced === 1 ? "" : "s"}`
        );
        router.refresh();
      } else {
        setStatus("error");
        setMessage(data?.error ?? "Sync failed");
      }
    } catch {
      setStatus("error");
      setMessage("Sync failed");
    }
    setTimeout(() => { setStatus("idle"); setMessage(null); }, 4000);
  };

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={sync}
        disabled={status === "loading"}
        className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 hover:text-white text-xs font-medium transition"
      >
        {status === "loading" ? "Syncing…" : `Sync plans to ${providerLabel}`}
      </button>
      {message && (
        <span className={`text-xs ${status === "error" ? "text-red-400" : "text-green-400"}`}>{message}</span>
      )}
    </span>
  );
}
