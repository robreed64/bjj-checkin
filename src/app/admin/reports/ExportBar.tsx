"use client";

const btn = "px-3 py-1.5 rounded-lg text-xs font-medium transition";
const dl  = `${btn} bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700`;
const pr  = `${btn} bg-blue-600 hover:bg-blue-500 text-white`;

export function ExportBar() {
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <a href="/api/admin/reports/export/members"   download className={dl}>↓ Members CSV</a>
      <a href="/api/admin/reports/export/sales"     download className={dl}>↓ Sales CSV</a>
      <a href="/api/admin/reports/export/attendance" download className={dl}>↓ Attendance CSV</a>
      <button onClick={() => window.print()} className={pr}>Print / Save PDF</button>
    </div>
  );
}
