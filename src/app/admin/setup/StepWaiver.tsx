"use client";

import { type WizardValues } from "./WizardShell";

type Props = { values: WizardValues; onChange: (v: Partial<WizardValues>) => void; onNext: () => void; onBack: () => void };

export default function StepWaiver({ values, onChange, onNext, onBack }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">Liability Waiver</h2>
        <p className="text-sm text-gray-400 mt-1">Members see and sign this at enrollment. Edit it to match your gym&apos;s name and local requirements.</p>
      </div>

      <textarea
        value={values.waiverText}
        onChange={e => onChange({ waiverText: e.target.value })}
        rows={14}
        className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm font-mono focus:outline-none focus:border-blue-500 resize-y"
      />

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-semibold text-sm transition">Back</button>
        <button onClick={onNext} className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition">Continue</button>
      </div>
    </div>
  );
}
