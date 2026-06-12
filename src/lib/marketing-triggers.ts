import type { Workflow } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";
import { getGymSettings } from "@/lib/gym-settings";

type WorkflowConfig = {
  channel:        string;
  subject?:       string;
  body:           string;
  inactivity_days?: number;
  trial_classes?:   number;
  cooldown_days?:   number;
  days_before?:     number;
};

type Target = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  vars: Record<string, string>;
};

export type WorkflowRunResult = { sent: number; skipped: number; note?: string };

function render(template: string, vars: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

// Returns members who were already messaged by this workflow within cooldown window
async function recentlyMessaged(workflowId: number, memberIds: number[], cooldownDays: number) {
  const cutoff = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000);
  const recent = await prisma.message.findMany({
    where: { workflowId, memberId: { in: memberIds }, sentAt: { gte: cutoff } },
    select: { memberId: true },
  });
  return new Set(recent.map((m) => m.memberId));
}

async function deliver(channel: string, target: Target, subject: string | null, body: string) {
  if (channel === "email" && target.email) {
    await sendEmail(target.email, subject ?? "(no subject)", `<p>${body.replace(/\n/g, "<br>")}</p>`);
  } else if (channel === "sms" && target.phone) {
    await sendSMS(target.phone, body);
  }
}

export async function runWorkflow(workflow: Workflow): Promise<WorkflowRunResult> {
  const config    = workflow.config as WorkflowConfig;
  const cooldown  = config.cooldown_days ?? 30;
  const now       = new Date();
  let   targets: Target[] = [];

  // ── Inactivity ──────────────────────────────────────────────────────────────
  if (workflow.triggerType === "inactivity") {
    const days   = config.inactivity_days ?? 30;
    const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const members = await prisma.member.findMany({
      where: {
        status: "active",
        attendance: { none: { timestamp: { gte: cutoff } } },
      },
      select: { id: true, name: true, email: true, phone: true, attendance: { orderBy: { timestamp: "desc" }, take: 1 } },
    });

    targets = members.map((m) => {
      const last   = m.attendance[0]?.timestamp;
      const daysAgo = last
        ? Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
        : days;
      return { id: m.id, name: m.name, email: m.email, phone: m.phone, vars: { name: m.name.split(" ")[0], days: String(daysAgo) } };
    });
  }

  // ── Trial attendance ─────────────────────────────────────────────────────────
  if (workflow.triggerType === "trial_attendance") {
    const minClasses = config.trial_classes ?? 3;
    const members = await prisma.member.findMany({
      where: { status: "trial" },
      include: { _count: { select: { attendance: true } } },
    });
    const eligible = members.filter((m) => m._count.attendance >= minClasses);
    targets = eligible.map((m) => ({
      id: m.id, name: m.name, email: m.email, phone: m.phone,
      vars: { name: m.name.split(" ")[0], classes: String(m._count.attendance) },
    }));
  }

  // ── Birthday ─────────────────────────────────────────────────────────────────
  // Compares against server (UTC) date; a few hours off from gym-local is acceptable.
  if (workflow.triggerType === "birthday") {
    const month = now.getMonth() + 1;
    const day   = now.getDate();
    const members = await prisma.$queryRaw<{ id: number; name: string; email: string | null; phone: string | null }[]>`
      SELECT id, name, email, phone FROM members
      WHERE date_of_birth IS NOT NULL
        AND EXTRACT(MONTH FROM date_of_birth) = ${month}
        AND EXTRACT(DAY   FROM date_of_birth) = ${day}
    `;
    targets = members.map((m) => ({ id: m.id, name: m.name, email: m.email, phone: m.phone, vars: { name: m.name.split(" ")[0] } }));
  }

  // ── Trial expiring ───────────────────────────────────────────────────────────
  // Trials within `days_before` of expiry (expiry = trialStartedAt + trialLengthDays)
  if (workflow.triggerType === "trial_expiring") {
    const daysBefore  = config.days_before ?? 3;
    const settings    = await getGymSettings();
    const trialLength = settings.trialLengthDays;
    const dayMs       = 24 * 60 * 60 * 1000;
    // Expiring within the window ⇔ trialStartedAt in (now - trialLength, now - trialLength + daysBefore]
    const startMin = new Date(now.getTime() - trialLength * dayMs);
    const startMax = new Date(now.getTime() - (trialLength - daysBefore) * dayMs);

    const members = await prisma.member.findMany({
      where: {
        status: "trial",
        trialStartedAt: { gt: startMin, lte: startMax },
      },
      select: { id: true, name: true, email: true, phone: true, trialStartedAt: true },
    });

    targets = members.map((m) => {
      const expiresAt = new Date(m.trialStartedAt!.getTime() + trialLength * dayMs);
      const daysLeft  = Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / dayMs));
      return {
        id: m.id, name: m.name, email: m.email, phone: m.phone,
        vars: { name: m.name.split(" ")[0], days_left: String(daysLeft) },
      };
    });
  }

  // ── Failed payment ───────────────────────────────────────────────────────────
  // The Stripe webhook only flips members to past_due — it never messages them.
  // This workflow is the dunning reminder layer; cooldown prevents repeats.
  if (workflow.triggerType === "failed_payment") {
    const members = await prisma.member.findMany({
      where:  { status: "past_due" },
      select: { id: true, name: true, email: true, phone: true },
    });
    targets = members.map((m) => ({ id: m.id, name: m.name, email: m.email, phone: m.phone, vars: { name: m.name.split(" ")[0] } }));
  }

  // ── Promotion ────────────────────────────────────────────────────────────────
  // Promotion is event-driven; the trigger endpoint is called directly with memberId + belt
  if (workflow.triggerType === "promotion") {
    return { sent: 0, skipped: 0, note: "Promotion workflows fire on individual promote events." };
  }

  if (targets.length === 0) {
    return { sent: 0, skipped: 0 };
  }

  // Filter out members messaged within cooldown window
  const spamSet = await recentlyMessaged(workflow.id, targets.map((t) => t.id), cooldown);
  const eligible = targets.filter((t) => !spamSet.has(t.id));

  // Create message records and deliver
  let sent = 0;
  await Promise.all(
    eligible.map(async (t) => {
      const subject = config.subject ? render(config.subject, t.vars) : null;
      const body    = render(config.body, t.vars);

      await prisma.message.create({
        data: { memberId: t.id, workflowId: workflow.id, channel: config.channel, subject, body, sentAt: now },
      });

      try {
        await deliver(config.channel, t, subject, body);
        sent++;
      } catch (err) {
        console.error(`Delivery failed for member ${t.id}:`, err);
      }
    })
  );

  return { sent, skipped: targets.length - eligible.length };
}

export async function runAllActiveWorkflows() {
  const workflows = await prisma.workflow.findMany({
    where: { active: true, triggerType: { not: "promotion" } },
  });

  const results: { workflowId: number; name: string; sent: number; skipped: number; note?: string }[] = [];
  for (const workflow of workflows) {
    const result = await runWorkflow(workflow);
    results.push({ workflowId: workflow.id, name: workflow.name, ...result });
  }
  return results;
}
