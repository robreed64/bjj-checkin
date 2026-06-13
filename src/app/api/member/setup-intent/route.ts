import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireMember } from "@/lib/require-member";
import { getPaymentProvider } from "@/lib/payments/provider";

// Starts card collection for the member portal. Returns a CardSetupSession:
// Stripe includes a SetupIntent clientSecret; Square tokenizes client-side.
export async function POST() {
  const auth = await requireMember();
  if (auth.error) return auth.error;
  const { memberId } = auth;

  const provider = await getPaymentProvider();
  if (!provider) return NextResponse.json({ error: "Payments not configured" }, { status: 503 });

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { name: true, email: true, stripeCustomerId: true, squareCustomerId: true },
  });
  if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

  let customerId =
    provider.name === "square" ? member.squareCustomerId : member.stripeCustomerId;

  if (!customerId) {
    if (provider.name === "square") {
      // Square members may have enrolled without payment — create on demand
      customerId = await provider.createCustomer({ name: member.name, email: member.email });
      await provider.tagCustomerWithMember(customerId, memberId);
      await prisma.member.update({ where: { id: memberId }, data: { squareCustomerId: customerId } });
    } else {
      return NextResponse.json({ error: "No Stripe customer on file" }, { status: 400 });
    }
  }

  const session = await provider.beginCardSetup(customerId);
  return NextResponse.json(session);
}
