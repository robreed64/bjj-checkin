import { describe, it, expect } from "vitest";
import { can, navForRole, type Feature } from "./permissions";

describe("can", () => {
  it("grants admin every feature", () => {
    const all: Feature[] = [
      "settings", "setup", "users", "members", "plans", "schedule",
      "belts", "curriculum", "families", "pos", "marketing", "reports",
      "kiosk", "leads", "notifications",
    ];
    for (const f of all) expect(can("admin", f)).toBe(true);
  });

  it("denies manager and staff the admin-only features", () => {
    for (const role of ["manager", "staff"]) {
      expect(can(role, "settings")).toBe(false);
      expect(can(role, "setup")).toBe(false);
      expect(can(role, "users")).toBe(false);
      expect(can(role, "members")).toBe(true);
      expect(can(role, "marketing")).toBe(true);
    }
  });

  it("limits front_desk to members, pos, schedule, kiosk", () => {
    expect(can("front_desk", "members")).toBe(true);
    expect(can("front_desk", "pos")).toBe(true);
    expect(can("front_desk", "schedule")).toBe(true);
    expect(can("front_desk", "kiosk")).toBe(true);
    expect(can("front_desk", "reports")).toBe(false);
    expect(can("front_desk", "marketing")).toBe(false);
    expect(can("front_desk", "settings")).toBe(false);
  });

  it("denies unknown and missing roles", () => {
    expect(can("member", "members")).toBe(false);
    expect(can("parent", "kiosk")).toBe(false);
    expect(can(undefined, "members")).toBe(false);
    expect(can("nonsense", "pos")).toBe(false);
  });
});

describe("navForRole", () => {
  it("returns the full nav for admin", () => {
    const hrefs = navForRole("admin").map((i) => i.href);
    expect(hrefs).toContain("/admin/users");
    expect(hrefs).toContain("/admin/members");
    expect(hrefs).toContain("/kiosk");
  });

  it("filters nav for front_desk", () => {
    const hrefs = navForRole("front_desk").map((i) => i.href);
    expect(hrefs).toEqual(["/admin/members", "/admin/schedule", "/admin/pos", "/kiosk"]);
  });

  it("returns nothing for portal roles", () => {
    expect(navForRole("member")).toEqual([]);
    expect(navForRole(undefined)).toEqual([]);
  });
});
