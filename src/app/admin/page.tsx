import { redirect } from "next/navigation";
import { getGymSettings } from "@/lib/gym-settings";

export default async function AdminRoot() {
  const settings = await getGymSettings();
  if (!settings.setupComplete) redirect("/admin/setup");
  redirect("/admin/members");
}
