import { describe, it, expect, vi } from "vitest";
import type { Workflow } from "@prisma/client";

vi.mock("@/lib/prisma", () => import("@/test/prisma-mock"));
vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/sms", () => ({ sendSMS: vi.fn() }));

import { prisma } from "@/test/prisma-mock";
import { sendEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";
import { runWorkflow, runAllActiveWorkflows } from "./marketing-triggers";

function workflow(overrides: Partial<Workflow>): Workflow {
  return {
    id: 1,
    name: "Test workflow",
    triggerType: "inactivity",
    config: { channel: "email", subject: "Hi {{name}}", body: "Miss you, {{name}} — {{days}} days!" },
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as Workflow;
}

describe("runWorkflow — inactivity", () => {
  it("messages inactive members with rendered template vars", async () => {
    const last = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
    prisma.member.findMany.mockResolvedValue([
      { id: 7, name: "Jane Doe", email: "jane@x.com", phone: null, attendance: [{ timestamp: last }] },
    ] as never);
    prisma.message.findMany.mockResolvedValue([]);
    prisma.message.create.mockResolvedValue({} as never);

    const result = await runWorkflow(workflow({}));

    expect(result).toEqual({ sent: 1, skipped: 0 });
    expect(sendEmail).toHaveBeenCalledWith("jane@x.com", "Hi Jane", expect.stringContaining("Miss you, Jane — 40 days!"));
    expect(prisma.message.create).toHaveBeenCalledOnce();
  });

  it("skips members messaged within the cooldown window", async () => {
    prisma.member.findMany.mockResolvedValue([
      { id: 7, name: "Jane Doe", email: "jane@x.com", phone: null, attendance: [] },
      { id: 8, name: "Bob Roe", email: "bob@x.com", phone: null, attendance: [] },
    ] as never);
    prisma.message.findMany.mockResolvedValue([{ memberId: 7 }] as never);
    prisma.message.create.mockResolvedValue({} as never);

    const result = await runWorkflow(workflow({}));

    expect(result).toEqual({ sent: 1, skipped: 1 });
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith("bob@x.com", expect.any(String), expect.any(String));
  });

  it("records the message even when delivery fails, without throwing", async () => {
    prisma.member.findMany.mockResolvedValue([
      { id: 7, name: "Jane Doe", email: "jane@x.com", phone: null, attendance: [] },
    ] as never);
    prisma.message.findMany.mockResolvedValue([]);
    prisma.message.create.mockResolvedValue({} as never);
    vi.mocked(sendEmail).mockRejectedValueOnce(new Error("brevo down"));

    const result = await runWorkflow(workflow({}));

    expect(result).toEqual({ sent: 0, skipped: 0 });
    expect(prisma.message.create).toHaveBeenCalledOnce();
  });
});

describe("runWorkflow — other triggers", () => {
  it("trial_attendance only targets trials at or above the class threshold", async () => {
    prisma.member.findMany.mockResolvedValue([
      { id: 1, name: "New Trial", email: "new@x.com", phone: null, _count: { attendance: 1 } },
      { id: 2, name: "Hot Trial", email: "hot@x.com", phone: null, _count: { attendance: 4 } },
    ] as never);
    prisma.message.findMany.mockResolvedValue([]);
    prisma.message.create.mockResolvedValue({} as never);

    const result = await runWorkflow(workflow({
      triggerType: "trial_attendance",
      config: { channel: "email", subject: "s", body: "{{classes}} classes", trial_classes: 3 },
    }));

    expect(result.sent).toBe(1);
    expect(sendEmail).toHaveBeenCalledWith("hot@x.com", "s", expect.stringContaining("4 classes"));
  });

  it("birthday uses raw query and delivers via sms channel", async () => {
    prisma.$queryRaw.mockResolvedValue([
      { id: 3, name: "Bday Kid", email: null, phone: "+15551234567" },
    ] as never);
    prisma.message.findMany.mockResolvedValue([]);
    prisma.message.create.mockResolvedValue({} as never);

    const result = await runWorkflow(workflow({
      triggerType: "birthday",
      config: { channel: "sms", body: "Happy birthday {{name}}!" },
    }));

    expect(result.sent).toBe(1);
    expect(sendSMS).toHaveBeenCalledWith("+15551234567", "Happy birthday Bday!");
  });

  it("promotion is a no-op with an explanatory note", async () => {
    const result = await runWorkflow(workflow({ triggerType: "promotion" }));
    expect(result.sent).toBe(0);
    expect(result.note).toMatch(/promote events/i);
    expect(prisma.member.findMany).not.toHaveBeenCalled();
  });
});

describe("runAllActiveWorkflows", () => {
  it("runs every active non-promotion workflow and labels results", async () => {
    prisma.workflow.findMany.mockResolvedValue([
      workflow({ id: 1, name: "Win-back", triggerType: "failed_payment" }),
    ] as never);
    prisma.member.findMany.mockResolvedValue([]);

    const results = await runAllActiveWorkflows();

    expect(prisma.workflow.findMany).toHaveBeenCalledWith({
      where: { active: true, triggerType: { not: "promotion" } },
    });
    expect(results).toEqual([{ workflowId: 1, name: "Win-back", sent: 0, skipped: 0 }]);
  });
});
