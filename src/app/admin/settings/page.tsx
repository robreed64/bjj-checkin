"use client";

import { useState, useEffect, FormEvent } from "react";

type GymSettings = {
  gymName: string;
  gymEmail: string;
  gymPhone: string;
  gymAddress: string;
  logoUrl: string;
  waiverText: string;
  currency: string;
  currencySymbol: string;
  locale: string;
  timezone: string;
  defaultTaxRate: number;
};

const CURRENCIES = [
  { value: "usd", symbol: "$",   locale: "en-US", label: "USD — US Dollar ($)" },
  { value: "cad", symbol: "CA$", locale: "en-CA", label: "CAD — Canadian Dollar (CA$)" },
  { value: "gbp", symbol: "£",   locale: "en-GB", label: "GBP — British Pound (£)" },
  { value: "eur", symbol: "€",   locale: "de-DE", label: "EUR — Euro (€)" },
  { value: "aud", symbol: "A$",  locale: "en-AU", label: "AUD — Australian Dollar (A$)" },
];

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Phoenix", "America/Anchorage", "Pacific/Honolulu",
  "America/Toronto", "America/Vancouver",
  "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Australia/Sydney", "Australia/Melbourne", "Pacific/Auckland",
];

const input = "w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm";
const select = "w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500 text-sm";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  );
}

function SaveButton({ loading, status }: { loading: boolean; status: "idle" | "loading" | "ok" | "error" }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition"
    >
      {loading ? "Saving…" : status === "ok" ? "Saved ✓" : "Save"}
    </button>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<GymSettings | null>(null);

  // Password change state
  const [pwCurrent, setPwCurrent]  = useState("");
  const [pwNext,    setPwNext]     = useState("");
  const [pwConfirm, setPwConfirm]  = useState("");
  const [pwStatus,  setPwStatus]   = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [pwMsg,     setPwMsg]      = useState("");

  // Per-section save status
  const [infoStatus,   setInfoStatus]   = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [regionStatus, setRegionStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [waiverStatus, setWaiverStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [taxStatus,    setTaxStatus]    = useState<"idle" | "loading" | "ok" | "error">("idle");

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(setSettings);
  }, []);

  const patch = async (data: Partial<GymSettings>) => {
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) setSettings(s => s ? { ...s, ...data } : s);
    return res.ok;
  };

  const handleCurrency = (val: string) => {
    const c = CURRENCIES.find(c => c.value === val);
    if (c && settings) setSettings({ ...settings, currency: c.value, currencySymbol: c.symbol, locale: c.locale });
  };

  const save = async (
    fields: Partial<GymSettings>,
    setStatus: (s: "idle" | "loading" | "ok" | "error") => void
  ) => {
    setStatus("loading");
    const ok = await patch(fields);
    setStatus(ok ? "ok" : "error");
    setTimeout(() => setStatus("idle"), 2500);
  };

  const handlePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwStatus("loading"); setPwMsg("");
    if (pwNext !== pwConfirm) { setPwStatus("error"); setPwMsg("Passwords do not match."); return; }
    if (pwNext.length < 6)    { setPwStatus("error"); setPwMsg("Min 6 characters."); return; }
    const res = await fetch("/api/admin/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNext }),
    });
    const d = await res.json();
    if (res.ok) { setPwStatus("ok"); setPwMsg("Password updated."); setPwCurrent(""); setPwNext(""); setPwConfirm(""); }
    else        { setPwStatus("error"); setPwMsg(d.error ?? "Something went wrong."); }
  };

  if (!settings) return <div className="p-8 text-gray-500 text-sm">Loading…</div>;

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* Gym Info */}
      <Section title="Gym Information">
        <form onSubmit={e => { e.preventDefault(); save({ gymName: settings.gymName, gymEmail: settings.gymEmail, gymPhone: settings.gymPhone, gymAddress: settings.gymAddress, logoUrl: settings.logoUrl }, setInfoStatus); }} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Gym Name</label>
            <input type="text" required value={settings.gymName} onChange={e => setSettings({ ...settings, gymName: e.target.value })} className={input} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
              <input type="email" value={settings.gymEmail} onChange={e => setSettings({ ...settings, gymEmail: e.target.value })} className={input} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Phone</label>
              <input type="tel" value={settings.gymPhone} onChange={e => setSettings({ ...settings, gymPhone: e.target.value })} className={input} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Address</label>
            <input type="text" value={settings.gymAddress} onChange={e => setSettings({ ...settings, gymAddress: e.target.value })} className={input} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Logo URL</label>
            <input type="url" value={settings.logoUrl} onChange={e => setSettings({ ...settings, logoUrl: e.target.value })} className={input} placeholder="https://yourgym.com/logo.png" />
          </div>
          <SaveButton loading={infoStatus === "loading"} status={infoStatus} />
        </form>
      </Section>

      {/* Region */}
      <Section title="Region & Currency">
        <form onSubmit={e => { e.preventDefault(); save({ currency: settings.currency, currencySymbol: settings.currencySymbol, locale: settings.locale, timezone: settings.timezone }, setRegionStatus); }} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Currency</label>
            <select value={settings.currency} onChange={e => handleCurrency(e.target.value)} className={select}>
              {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Timezone</label>
            <select value={settings.timezone} onChange={e => setSettings({ ...settings, timezone: e.target.value })} className={select}>
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace("_", " ")}</option>)}
            </select>
          </div>
          <SaveButton loading={regionStatus === "loading"} status={regionStatus} />
        </form>
      </Section>

      {/* Waiver */}
      <Section title="Liability Waiver">
        <form onSubmit={e => { e.preventDefault(); save({ waiverText: settings.waiverText }, setWaiverStatus); }} className="space-y-4">
          <p className="text-xs text-gray-500">Members read and sign this at enrollment.</p>
          <textarea
            value={settings.waiverText}
            onChange={e => setSettings({ ...settings, waiverText: e.target.value })}
            rows={12}
            className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm font-mono focus:outline-none focus:border-blue-500 resize-y"
          />
          <SaveButton loading={waiverStatus === "loading"} status={waiverStatus} />
        </form>
      </Section>

      {/* Tax */}
      <Section title="Tax & POS">
        <form onSubmit={e => { e.preventDefault(); save({ defaultTaxRate: settings.defaultTaxRate }, setTaxStatus); }} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Default Tax Rate (%)</label>
            <input
              type="number" min={0} max={100} step={0.01}
              value={settings.defaultTaxRate}
              onChange={e => setSettings({ ...settings, defaultTaxRate: parseFloat(e.target.value) || 0 })}
              className="w-48 px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Applied to new POS items by default. Override per item as needed.</p>
          </div>
          <SaveButton loading={taxStatus === "loading"} status={taxStatus} />
        </form>
      </Section>

      {/* Change Password */}
      <Section title="Change Password">
        <form onSubmit={handlePassword} className="space-y-4">
          {pwStatus === "ok"    && <div className="bg-green-900/30 border border-green-800 text-green-300 text-sm rounded-lg px-4 py-3">{pwMsg}</div>}
          {pwStatus === "error" && <div className="bg-red-900/30 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">{pwMsg}</div>}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Current Password</label>
            <input type="password" required value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} className={input} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">New Password</label>
            <input type="password" required value={pwNext} onChange={e => setPwNext(e.target.value)} className={input} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Confirm New Password</label>
            <input type="password" required value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} className={input} />
          </div>
          <SaveButton loading={pwStatus === "loading"} status={pwStatus} />
        </form>
      </Section>
    </div>
  );
}
