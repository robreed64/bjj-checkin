import webpush from "web-push";
import { prisma } from "./prisma";
import { getGymSettings } from "./gym-settings";

type PushSub = { endpoint: string; p256dh: string; auth: string };
type PushPayload = { title: string; body: string; url?: string };

async function getOrInitVapid(): Promise<{ publicKey: string; privateKey: string; email: string }> {
  const settings = await getGymSettings();
  const email = settings.gymEmail ?? "admin@gym.local";

  if (settings.vapidPublicKey && settings.vapidPrivateKey) {
    return { publicKey: settings.vapidPublicKey, privateKey: settings.vapidPrivateKey, email };
  }
  const keys = webpush.generateVAPIDKeys();
  await prisma.gymSettings.upsert({
    where: { id: 1 },
    update: { vapidPublicKey: keys.publicKey, vapidPrivateKey: keys.privateKey },
    create: { id: 1, vapidPublicKey: keys.publicKey, vapidPrivateKey: keys.privateKey },
  });
  return { publicKey: keys.publicKey, privateKey: keys.privateKey, email };
}

export async function getVapidPublicKey(): Promise<string> {
  return (await getOrInitVapid()).publicKey;
}

async function pruneExpired(endpoints: string[]) {
  if (endpoints.length === 0) return;
  await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: endpoints } } });
}

async function sendToSubscriptions(subs: PushSub[], payload: PushPayload): Promise<number> {
  const results = await Promise.allSettled(
    subs.map(s =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload)
      )
    )
  );

  await pruneExpired(
    subs
      .filter((_, i) => {
        const r = results[i];
        return r.status === "rejected" && (r.reason as { statusCode?: number })?.statusCode === 410;
      })
      .map(s => s.endpoint)
  );

  return results.filter(r => r.status === "fulfilled").length;
}

async function configure(): Promise<void> {
  const { publicKey, privateKey, email } = await getOrInitVapid();
  webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
}

export async function sendPushToUser(userId: number, payload: PushPayload): Promise<number> {
  const [, subs] = await Promise.all([
    configure(),
    prisma.pushSubscription.findMany({ where: { userId } }),
  ]);
  if (subs.length === 0) return 0;
  return sendToSubscriptions(subs, payload);
}

export async function sendPushToAll(payload: PushPayload): Promise<number> {
  const [, subs] = await Promise.all([
    configure(),
    prisma.pushSubscription.findMany(),
  ]);
  if (subs.length === 0) return 0;
  return sendToSubscriptions(subs, payload);
}
