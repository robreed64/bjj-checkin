"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLAN_TYPES = ["gi", "no-gi", "family", "kids", "online", "drop-in"];
const INTERVALS  = ["monthly", "yearly"];

export default function NewPlanPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", priceCents: "", billingInterval: "monthly", planType: "gi", classLimit: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.priceCents || !form.planType) {
      setError("Name, price, and type are required.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        priceCents: Math.round(parseFloat(form.priceCents) * 100),
        classLimit: form.classLimit ? parseInt(form.classLimit, 10) : null,
      }),
    });
    setSaving(false);
    if (res.ok) router.push("/admin/plans");
    else setError("Failed to create plan.");
  };

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-bold mb-6">New Membership Plan</h1>

      <div className="space-y-5">
        <Field label="Plan Name *">
          <input type="text" placeholder="Gi Unlimited" value={form.name}
            onChange={(e) => set("name", e.target.value)} className={input} />
        </Field>
        <Field label="Description">
          <input type="text" placeholder="Unlimited gi classes" value={form.description}
            onChange={(e) => set("description", e.target.value)} className={input} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Price (USD) *">
            <input type="number" step="0.01" min="0" placeholder="149.00" value={form.priceCents}
              onChange={(e) => set("priceCents", e.target.value)} className={input} />
          </Field>
          <Field label="Billing Interval">
            <select value={form.billingInterval} onChange={(e) => set("billingInterval", e.target.value)} className={input}>
              {INTERVALS.map((i) => <option key={i} value={i}>{i}</option>)}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Plan Type *">
            <select value={form.planType} onChange={(e) => set("planType", e.target.value)} className={input}>
              {PLAN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Class Limit (optional)">
            <input type="number" min="1" placeholder="Unlimited" value={form.classLimit}
              onChange={(e) => set("classLimit", e.target.value)} className={input} />
          </Field>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button onClick={() => router.push("/admin/plans")}
            className="px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-medium transition">
            Cancel
          </button>
          <button onClick={submit} disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-sm font-semibold text-white transition">
            {saving ? "Creating…" : "Create Plan"}
          </button>
        </div>
      </div>
    </div>
  );
}

const input = "w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm transition";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
