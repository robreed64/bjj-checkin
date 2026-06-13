import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/require-member";
import { getPaymentProvider } from "@/lib/payments/provider";

export async function GET() {
  const auth = await requireMember();
  if (auth.error) return auth.error;
  const { memberId } = auth;

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { id: true, stripeCustomerId: true, squareCustomerId: true, squareCardId: true },
  });
  if (!member) return NextResponse.json({ card: null });

  const provider = await getPaymentProvider();
  if (!provider) return NextResponse.json({ card: null });

  const card = await provider.getDefaultCard(member);
  return NextResponse.json({ card });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireMember();
  if (auth.error) return auth.error;
  const { memberId } = auth;

  const { paymentMethodId } = await req.json();
  if (!paymentMethodId) {
    return NextResponse.json({ error: "paymentMethodId required" }, { status: 400 });
  }

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { stripeCustomerId: true, squareCustomerId: true },
  });

  const provider = await getPaymentProvider();
  if (!provider) return NextResponse.json({ error: "Payments not configured" }, { status: 503 });

  const customerId =
    provider.name === "square" ? member?.squareCustomerId : member?.stripeCustomerId;
  if (!customerId) {
    return NextResponse.json({ error: "No customer on file" }, { status: 400 });
  }

  const saved = await provider.saveCard(customerId, paymentMethodId);

  if (provider.name === "square") {
    await prisma.member.update({ where: { id: memberId }, data: { squareCardId: saved.cardId } });
  }

  // Point active subscriptions on this provider at the new card
  const refColumn = provider.name === "square" ? "squareSubscriptionId" : "stripeSubscriptionId";
  const subs = await prisma.subscription.findMany({
    where: { memberId, status: "active", [refColumn]: { not: null } },
  });
  for (const sub of subs) {
    await provider
      .updateSubscriptionCard(sub[refColumn]!, saved.cardId)
      .catch(() => {});
  }

  return NextResponse.json({ success: true });
}
