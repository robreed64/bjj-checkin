"use client";

import Link from "next/link";
import { type WizardValues } from "./WizardShell";

type Props = { values: WizardValues; onChange: (v: Partial<WizardValues>) => void; onNext: () => void; onBack: () => void };

export default function StepTaxAndPOS({ values, onChange, onNext, onBack }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">Tax & POS</h2>
        <p className="text-sm text-gray-400 mt-1">Set a default tax rate applied to new POS items. You can override it per item.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1.5">Default Tax Rate (%)</label>
        <input
          type="number"
          min={0} max={100} step={0.01}
          value={values.defaultTaxRate}
          onChange={e => onChange({ defaultTaxRate: parseFloat(e.target.value) || 0 })}
          className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500 text-sm"
          placeholder="e.g. 8.5"
        />
        <p className="text-xs text-gray-500 mt-1">Enter 0 if you don&apos;t charge sales tax.</p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-400">
        You can review and edit your POS items (drinks, gear, events) at any time from{" "}
        <Link href="/admin/pos/items" className="text-blue-400 hover:underline">Admin → POS → Items</Link>.
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-semibold text-sm transition">Back</button>
        <button onClick={onNext} className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition">Continue</button>
      </div>
    </div>
  );
}
