import webpush from "web-push";
import { prisma } from "./prisma";
import { getGymSettings } from "./gym-settings";

async function getVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  const settings = await getGymSettings();
  if (settings.vapidPublicKey && settings.vapidPrivateKey) {
    return { publicKey: settings.vapidPublicKey, privateKey: settings.vapidPrivateKey };
  }
  const keys = webpush.generateVAPIDKeys();
  await prisma.gymSettings.upsert({
    where: { id: 1 },
    update: { vapidPublicKey: keys.publicKey, vapidPrivateKey: keys.privateKey },
    create: { id: 1, vapidPublicKey: keys.publicKey, vapidPrivateKey: keys.privateKey },
  });
  return keys;
}

export async function getVapidPublicKey(): Promise<string> {
  return (await getVapidKeys()).publicKey;
}

type PushPayload = { title: string; body: string; url?: string };

async function configureWebPush() {
  const { publicKey, privateKey } = await getVapidKeys();
  const settings = await getGymSettings();
  webpush.setVapidDetails(
    `mailto:${settings.gymEmail ?? "admin@gym.local"}`,
    publicKey,
    privateKey
  );
}

async function pruneExpired(endpoints: string[]) {
  if (endpoints.length === 0) return;
  await prisma.pushSubscription.deleteMany({ where: { endpoint: { in: endpoints } } });
}

export async function sendPushToUser(userId: number, payload: PushPayload): Promise<number> {
  await configureWebPush();
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return 0;

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

export async function sendPushToAll(payload: PushPayload): Promise<number> {
  await configureWebPush();
  const subs = await prisma.pushSubscription.findMany();
  if (subs.length === 0) return 0;

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
