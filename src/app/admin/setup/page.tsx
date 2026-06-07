import { getGymSettings } from "@/lib/gym-settings";
import WizardShell, { type WizardValues } from "./WizardShell";

export default async function SetupPage() {
  const s = await getGymSettings();

  const initialValues: WizardValues = {
    gymName:        s.gymName,
    gymEmail:       s.gymEmail        ?? "",
    gymPhone:       s.gymPhone        ?? "",
    gymAddress:     s.gymAddress      ?? "",
    logoUrl:        s.logoUrl         ?? "",
    waiverText:     s.waiverText,
    currency:       s.currency,
    currencySymbol: s.currencySymbol,
    locale:         s.locale,
    timezone:       s.timezone,
    defaultTaxRate: s.defaultTaxRate,
  };

  return <WizardShell initialValues={initialValues} />;
}
