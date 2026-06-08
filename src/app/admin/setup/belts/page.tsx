import Link from "next/link";
import { getGymSettings } from "@/lib/gym-settings";
import BeltSetupClient from "./BeltSetupClient";

export type BeltConfig = { key: string; name: string; color: string; maxStripes: number };

const DEFAULT_BELTS: BeltConfig[] = [
  { key: "white",  name: "White",  color: "#e5e7eb", maxStripes: 4 },
  { key: "blue",   name: "Blue",   color: "#3b82f6", maxStripes: 4 },
  { key: "purple", name: "Purple", color: "#a855f7", maxStripes: 4 },
  { key: "brown",  name: "Brown",  color: "#92400e", maxStripes: 4 },
  { key: "black",  name: "Black",  color: "#111827", maxStripes: 10 },
];

export default async function SetupBeltsPage() {
  const settings = await getGymSettings();
  const raw = settings.beltConfig as BeltConfig[];
  const belts = raw?.length ? raw : DEFAULT_BELTS;

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-6">
        <Link href="/admin/setup" className="text-sm text-amber-500 hover:text-amber-300 transition">← Configure</Link>
        <h1 className="text-2xl font-bold mt-2">Belts</h1>
        <p className="text-gray-400 text-sm mt-1">Configure belt ranks and stripe counts. Also visit <Link href="/admin/belts" className="text-blue-400 hover:underline">Belt Requirements</Link> for promotion thresholds.</p>
      </div>
      <BeltSetupClient belts={belts} />
    </div>
  );
}
