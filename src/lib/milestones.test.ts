import { describe, it, expect } from "vitest";
import { milestoneFor, nextMilestone, MILESTONES } from "./milestones";

describe("milestoneFor", () => {
  it("returns the milestone at exact thresholds", () => {
    for (const m of MILESTONES) expect(milestoneFor(m)).toBe(m);
  });

  it("returns null between thresholds", () => {
    expect(milestoneFor(0)).toBeNull();
    expect(milestoneFor(9)).toBeNull();
    expect(milestoneFor(11)).toBeNull();
    expect(milestoneFor(99)).toBeNull();
    expect(milestoneFor(101)).toBeNull();
    expect(milestoneFor(1001)).toBeNull();
  });
});

describe("nextMilestone", () => {
  it("returns the next threshold above the total", () => {
    expect(nextMilestone(0)).toBe(10);
    expect(nextMilestone(10)).toBe(25);
    expect(nextMilestone(99)).toBe(100);
  });

  it("returns null past the last milestone", () => {
    expect(nextMilestone(1000)).toBeNull();
    expect(nextMilestone(5000)).toBeNull();
  });
});
