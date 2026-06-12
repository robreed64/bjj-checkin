import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { sendPushToUser } from "@/lib/web-push";
import { getGymSettings } from "@/lib/gym-settings";

// Bookings that occupy a seat
export function countActiveBookings(classId: number) {
  return prisma.booking.count({
    where: { classId, status: { in: ["booked", "attended"] } },
  });
}

// Promote the oldest waitlisted booking when a seat frees up. Best-effort
// notification; promotion succeeds even if push/email fail.
export async function promoteWaitlist(classId: number) {
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: { capacity: true, name: true, startTime: true },
  });
  if (!cls || cls.capacity == null) return null;

  const active = await countActiveBookings(classId);
  if (active >= cls.capacity) return null;

  const next = await prisma.booking.findFirst({
    where: { classId, status: "waitlisted" },
    orderBy: { createdAt: "asc" },
    include: { member: { select: { id: true, name: true, email: true, user: { select: { id: true } } } } },
  });
  if (!next) return null;

  const promoted = await prisma.booking.update({
    where: { id: next.id },
    data: { status: "booked" },
  });

  const settings = await getGymSettings();
  const when = cls.startTime.toLocaleString("en-US", {
    weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
    timeZone: settings.timezone,
  });
  const body = `A spot opened up — you're now booked for ${cls.name} (${when}).`;
  try {
    let delivered = 0;
    if (next.member.user) {
      delivered = await sendPushToUser(next.member.user.id, {
        title: "You're off the waitlist!",
        body,
        url: "/member/schedule",
      });
    }
    if (delivered === 0 && next.member.email) {
      await sendEmail(next.member.email, "You're off the waitlist!", `<p>${body}</p>`);
    }
  } catch (err) {
    console.error(`Waitlist promotion notification failed for booking ${next.id}:`, err);
  }

  return promoted;
}
