"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";

export default function MemberQRCode({ memberId }: { memberId: number }) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/members/${memberId}/qr-token`)
      .then(r => r.json())
      .then(d => setToken(d.token))
      .catch(() => {});
  }, [memberId]);

  if (!token) return <div className="text-xs text-gray-500">Generating…</div>;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="bg-white p-3 rounded-xl">
        <QRCode value={token} size={140} />
      </div>
      <p className="text-xs text-gray-500 text-center">
        Member scans this at the kiosk to check in instantly.
      </p>
      <button
        onClick={() => window.print()}
        className="text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-3 py-1.5 rounded-lg transition"
      >
        Print card
      </button>
    </div>
  );
}
