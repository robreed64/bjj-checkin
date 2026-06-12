import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendPushToUser } from "@/lib/web-push";
import { getGymSettings } from "@/lib/gym-settings";

// Daily cron on Hobby plan → 24h "morning-of" window. On a Pro plan, switch the
// cron to hourly and call with windowHours = 2 for "2 hours before" reminders.
export const REMINDER_WINDOW_HOURS = 24;

function fmtTime(d: Date, timeZone: string) {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone });
}

export async function sendClassReminders(now = new Date(), windowHours = REMINDER_WINDOW_HOURS) {
  const windowEnd = new Date(now.getTime() + windowHours * 60 * 60 * 1000);
  const settings = await getGymSettings();

  const bookings = await prisma.booking.findMany({
    where: {
      status: "booked",
      reminderSentAt: null,
      class: { startTime: { gt: now, lte: windowEnd } },
    },
    include: {
      class: { select: { name: true, startTime: true } },
      member: { select: { id: true, name: true, email: true, user: { select: { id: true } } } },
    },
  });

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const booking of bookings) {
    const title = "Class reminder";
    const body  = `You're booked for ${booking.class.name} at ${fmtTime(booking.class.startTime, settings.timezone)}. See you on the mats!`;

    try {
      let delivered = 0;
      if (booking.member.user) {
        delivered = await sendPushToUser(booking.member.user.id, { title, body, url: "/member/schedule" });
      }
      if (delivered === 0 && booking.member.email) {
        await sendEmail(booking.member.email, `Reminder: ${booking.class.name}`, `<p>${body}</p>`);
        delivered = 1;
      }
      if (delivered > 0) sent++;
      else skipped++; // unreachable: no push subscription and no email on file
    } catch (err) {
      failed++;
      console.error(`Reminder delivery failed for booking ${booking.id}:`, err);
    }

    // Stamp regardless of delivery outcome — a broken provider shouldn't cause
    // repeated sends on the next run (same philosophy as the workflow engine)
    await prisma.booking.update({
      where: { id: booking.id },
      data: { reminderSentAt: now },
    });
  }

  return { sent, skipped, failed };
}
