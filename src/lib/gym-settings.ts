import { cache } from "react";
import { prisma } from "./prisma";

const DEFAULT_WAIVER = `PARTICIPATION AGREEMENT AND RELEASE OF LIABILITY

By enrolling at this academy, you ("Participant") acknowledge and agree to the following:

1. NATURE OF ACTIVITY. Brazilian Jiu-Jitsu (BJJ) is a full-contact martial art involving grappling, submissions, takedowns, and ground fighting. You understand that participation involves inherent risks of physical injury, including but not limited to bruises, sprains, fractures, joint injuries, and in rare cases, more serious harm.

2. ASSUMPTION OF RISK. You voluntarily assume all risks associated with participation in BJJ training, classes, seminars, open mats, and any other activities at this academy. You acknowledge that no amount of instruction or precaution can eliminate all risk.

3. MEDICAL FITNESS. You represent that you are in good physical health and have no condition, injury, or illness that would prevent safe participation. You agree to inform instructors of any health conditions, injuries, or limitations before participating.

4. RELEASE OF LIABILITY. To the fullest extent permitted by law, you release and hold harmless the academy, its owners, instructors, staff, and other participants from any and all claims, damages, or liability arising from your participation, including claims arising from negligence.

5. RULES AND CONDUCT. You agree to follow all academy rules, tap promptly when submitted or in pain, respect your training partners, and conduct yourself in a safe and sportsmanlike manner at all times.

6. PHOTO & MEDIA RELEASE. You grant permission for the academy to use photographs or video of you for promotional, educational, or social media purposes.

7. MEMBERSHIP TERMS. You understand that membership fees are billed on the selected interval and that cancellation requires written notice per the academy's cancellation policy.

By signing below, you confirm that you have read, understood, and agree to all terms of this agreement.`;

// Read-only in steady state (the row exists after first boot); created on first
// access. cache() dedupes the query within a request so layout + page share one.
export const getGymSettings = cache(async () => {
  const existing = await prisma.gymSettings.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  try {
    return await prisma.gymSettings.create({ data: { id: 1, waiverText: DEFAULT_WAIVER } });
  } catch {
    // Lost a concurrent first-boot race — the row exists now
    return prisma.gymSettings.findUniqueOrThrow({ where: { id: 1 } });
  }
});

export function formatCurrency(cents: number, symbol: string, locale: string): string {
  return symbol + (cents / 100).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
