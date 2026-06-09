import { prisma } from "@/lib/prisma";
import NotificationComposer from "./NotificationComposer";

export default async function NotificationsPage() {
  const [subscriberCount, members] = await Promise.all([
    prisma.pushSubscription.count(),
    prisma.member.findMany({
      where: { user: { pushSubscriptions: { some: {} } } },
      select: { id: true, name: true, user: { select: { id: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Push Notifications</h1>
        <p className="text-gray-500 text-sm mt-1">
          {subscriberCount} active subscriber{subscriberCount !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <NotificationComposer
          members={members.map(m => ({ memberId: m.id, name: m.name, userId: m.user!.id }))}
        />
      </div>

      {subscriberCount === 0 && (
        <p className="mt-6 text-sm text-gray-600 text-center">
          No subscribers yet. Members can enable push notifications from their profile page.
        </p>
      )}
    </div>
  );
}
