export const MILESTONES = [10, 25, 50, 100, 250, 500, 1000];

// Returns the milestone hit at exactly `total` classes, or null
export function milestoneFor(total: number): number | null {
  return MILESTONES.includes(total) ? total : null;
}

// Returns the next milestone above `total`, or null past the last one
export function nextMilestone(total: number): number | null {
  return MILESTONES.find((m) => m > total) ?? null;
}
