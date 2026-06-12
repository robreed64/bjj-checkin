"use client";

import { useState } from "react";
import SignaturePad from "@/components/SignaturePad";

type CheckinResult = {
  success?: boolean;
  totalClasses?: number;
  milestone?: number | null;
  member?: { name: string; beltRank: string | null };
};

type Props = {
  member: { id: number; name: string };
  classId: number | null;
  waiverText: string;
  onComplete: (data: CheckinResult) => void;
  onCancel: () => void;
};

export default function WaiverScreen({ member, classId, waiverText, onComplete, onCancel }: Props) {
  const [signed, setSigned] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const signRes = await fetch("/api/waiver/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member.id }),
      });
      if (!signRes.ok) throw new Error();

      const checkinRes = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member.id, classId }),
      });
      const data = await checkinRes.json();
      if (!checkinRes.ok || !data.success) throw new Error();
      onComplete(data);
    } catch {
      setError("Something went wrong — please try again or ask the front desk.");
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl">
      <div className="bg-gray-900 border border-gray-700 rounded-3xl p-6 md:p-8 space-y-5">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">Welcome, {member.name}!</h2>
          <p className="text-gray-400 text-sm mt-1">
            Before your first check-in, please read and sign the participation waiver.
          </p>
        </div>

        {waiverText.trim() ? (
          <div className="max-h-64 overflow-y-auto rounded-xl bg-gray-800 border border-gray-700 p-4 text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">
            {waiverText}
          </div>
        ) : (
          <div className="rounded-xl bg-amber-900/20 border border-amber-700/60 p-4 text-sm text-amber-300">
            The waiver text couldn&apos;t be loaded. Please see the front desk to sign a paper waiver.
          </div>
        )}

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 w-5 h-5 rounded accent-blue-600"
          />
          <span className="text-sm text-gray-300">
            I have read and agree to the terms of the participation agreement and release of liability.
          </span>
        </label>

        <SignaturePad onChange={setSigned} />

        {error && (
          <p className="text-sm text-red-400 bg-red-900/30 border border-red-800 rounded-lg px-4 py-3">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={submitting}
            className="px-5 py-3 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 text-sm font-medium transition"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!signed || !agreed || submitting || !waiverText.trim()}
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold transition"
          >
            {submitting ? "Signing…" : "Sign & Check In"}
          </button>
        </div>
      </div>
    </div>
  );
}
