"use client";

import { type WizardValues } from "./WizardShell";

type Props = { values: WizardValues; onChange: (v: Partial<WizardValues>) => void; onNext: () => void; onBack: () => void };

const CURRENCIES = [
  { value: "usd", symbol: "$",  locale: "en-US", label: "USD — US Dollar ($)" },
  { value: "cad", symbol: "CA$", locale: "en-CA", label: "CAD — Canadian Dollar (CA$)" },
  { value: "gbp", symbol: "£",  locale: "en-GB", label: "GBP — British Pound (£)" },
  { value: "eur", symbol: "€",  locale: "de-DE", label: "EUR — Euro (€)" },
  { value: "aud", symbol: "A$", locale: "en-AU", label: "AUD — Australian Dollar (A$)" },
];

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Phoenix", "America/Anchorage", "Pacific/Honolulu",
  "America/Toronto", "America/Vancouver",
  "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Australia/Sydney", "Australia/Melbourne", "Pacific/Auckland",
];

const select = "w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500 text-sm";

export default function StepRegion({ values, onChange, onNext, onBack }: Props) {
  const handleCurrency = (val: string) => {
    const c = CURRENCIES.find(c => c.value === val);
    if (c) onChange({ currency: c.value, currencySymbol: c.symbol, locale: c.locale });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">Region & Currency</h2>
        <p className="text-sm text-gray-400 mt-1">Used for price formatting and date display throughout the app.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1.5">Currency</label>
        <select value={values.currency} onChange={e => handleCurrency(e.target.value)} className={select}>
          {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1.5">Timezone</label>
        <select value={values.timezone} onChange={e => onChange({ timezone: e.target.value })} className={select}>
          {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace("_", " ")}</option>)}
        </select>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-semibold text-sm transition">Back</button>
        <button onClick={onNext} className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition">Continue</button>
      </div>
    </div>
  );
}
