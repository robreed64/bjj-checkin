"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { type WizardValues } from "./WizardShell";

type Props = { values: WizardValues; onBack: () => void };

export default function StepDone({ values, onBack }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    setSaving(true);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...values, setupComplete: true }),
    });
    router.push("/admin");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-white">You&apos;re all set!</h2>
        <p className="text-sm text-gray-400 mt-2">Here&apos;s a summary of your configuration.</p>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 divide-y divide-gray-700 text-sm">
        {[
          ["Gym Name",     values.gymName],
          ["Email",        values.gymEmail  || "—"],
          ["Phone",        values.gymPhone  || "—"],
          ["Address",      values.gymAddress || "—"],
          ["Currency",     `${values.currencySymbol} (${values.currency.toUpperCase()})`],
          ["Timezone",     values.timezone],
          ["Default Tax",  `${values.defaultTaxRate}%`],
        ].map(([label, val]) => (
          <div key={label} className="flex justify-between px-4 py-3">
            <span className="text-gray-400">{label}</span>
            <span className="text-white font-medium truncate max-w-[55%] text-right">{val}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-500 text-center">
        You can update any of these later from <strong className="text-gray-400">Settings</strong>.
      </p>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-semibold text-sm transition">Back</button>
        <button onClick={handleFinish} disabled={saving} className="flex-1 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold text-sm transition">
          {saving ? "Saving…" : "Go to Dashboard"}
        </button>
      </div>
    </div>
  );
}
