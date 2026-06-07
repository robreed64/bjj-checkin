"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const BELTS   = ["white", "blue", "purple", "brown", "black"];
const STATUSES = ["active", "trial", "past_due", "inactive", "lead", "canceled"];
const TYPES   = ["Gi", "No-Gi", "Both"];
const GROUPS  = ["adult", "kids"];

export default function MemberFilters() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) params.set(key, value);
      else params.delete(key);
      params.delete("page"); // reset pagination on filter change
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const val = (key: string) => searchParams.get(key) ?? "";

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Search */}
      <input
        type="text"
        placeholder="Search name or email…"
        defaultValue={val("q")}
        onChange={(e) => update("q", e.target.value)}
        className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 w-56"
      />

      <Select label="Belt"   name="belt"   value={val("belt")}   options={BELTS}    onChange={(v) => update("belt", v)} />
      <Select label="Status" name="status" value={val("status")} options={STATUSES} onChange={(v) => update("status", v)} />
      <Select label="Type"   name="type"   value={val("type")}   options={TYPES}    onChange={(v) => update("type", v)} />
      <Select label="Group"  name="group"  value={val("group")}  options={GROUPS}   onChange={(v) => update("group", v)} />

      {(val("q") || val("belt") || val("status") || val("type") || val("group")) && (
        <button
          onClick={() => router.push(pathname)}
          className="px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function Select({
  label, name, value, options, onChange,
}: {
  label: string; name: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <select
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:border-blue-500"
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
        </option>
      ))}
    </select>
  );
}
