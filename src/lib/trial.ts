const DAY_MS = 24 * 60 * 60 * 1000;

// Days until the trial expires (<= 0 means expired); null when no trial start is recorded
export function trialDaysLeft(trialStartedAt: Date | null, trialLengthDays: number): number | null {
  if (!trialStartedAt) return null;
  const expiresAt = trialStartedAt.getTime() + trialLengthDays * DAY_MS;
  return Math.ceil((expiresAt - Date.now()) / DAY_MS);
}

export function trialBadge(trialStartedAt: Date | null, trialLengthDays: number): string {
  const left = trialDaysLeft(trialStartedAt, trialLengthDays);
  if (left === null) return "trial";
  return left > 0 ? `trial · ${left}d left` : "trial · expired";
}
