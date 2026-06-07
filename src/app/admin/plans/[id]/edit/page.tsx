"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

const PLAN_TYPES = ["gi", "no-gi", "family", "kids", "online", "drop-in"];

const input = "w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm transition";
const readOnly = "w-full px-3 py-2.5 rounded-lg bg-gray-900 border border-gray-800 text-gray-500 text-sm cursor-not-allowed";

type Plan = {
  id:              number;
  name:            string;
  description:     string | null;
  priceCents:      number;
  billingInterval: string;
  planType:        string;
  classLimit:      number | null;
  stripePriceId:   string | null;
};

export default function EditPlanPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id     = params?.id;

  const [plan,   setPlan]   = useState<Plan | null>(null);
  const [form,   setForm]   = useState({ name: "", description: "", planType: "gi", classLimit: "" });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/admin/plans/${id}`)
      .then((r) => r.json())
      .then((p: Plan) => {
        setPlan(p);
        setForm({
          name:        p.name,
          description: p.description ?? "",
          planType:    p.planType,
          classLimit:  p.classLimit != null ? String(p.classLimit) : "",
        });
      })
      .catch(() => setError("Failed to load plan."));
  }, [id]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name) { setError("Name is required."); return; }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/plans/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        name:        form.name,
        description: form.description || null,
        planType:    form.planType,
        classLimit:  form.classLimit ? parseInt(form.classLimit, 10) : null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      router.push("/admin/plans");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save changes.");
    }
  };

  if (!plan && !error) {
    return <div className="p-8 text-gray-500 text-sm">Loading…</div>;
  }

  return (
    <div className="p-8 max-w-lg">
      <Link href="/admin/plans" className="text-sm text-gray-400 hover:text-white transition mb-6 inline-flex items-center gap-1">
        ← Plans
      </Link>

      <h1 className="text-2xl font-bold mt-4 mb-6">Edit Plan</h1>

      {error && !plan && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {plan && (
        <div className="space-y-5">
          <Field label="Plan Name *">
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)}
              className={input} placeholder="Gi Unlimited" />
          </Field>

          <Field label="Description">
            <input type="text" value={form.description} onChange={(e) => set("description", e.target.value)}
              className={input} placeholder="Unlimited gi classes" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Price (USD)" hint="Cannot be changed">
              <input readOnly value={`$${(plan.priceCents / 100).toFixed(2)}`} className={readOnly} />
            </Field>
            <Field label="Billing Interval" hint="Cannot be changed">
              <input readOnly value={plan.billingInterval} className={`${readOnly} capitalize`} />
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

          {plan.stripePriceId && (
            <p className="text-xs text-green-400">● Stripe synced — name and description will be updated in Stripe.</p>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button onClick={() => router.push("/admin/plans")}
              className="px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-medium transition">
              Cancel
            </button>
            <button onClick={submit} disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-sm font-semibold text-white transition">
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        <label className="block text-sm font-medium text-gray-300">{label}</label>
        {hint && <span className="text-xs text-gray-600">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
