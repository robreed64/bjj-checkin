import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripeClient } from "@/lib/stripe";
import bcrypt from "bcryptjs";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    name, email, phone, dateOfBirth, ageGroup, trainingType,
    planId, stripeCustomerId, paymentMethodId, promoCode,
  } = body;

  if (!name?.trim() || !email?.trim() || !phone?.trim()) {
    return NextResponse.json({ error: "Name, email, and phone are required" }, { status: 400 });
  }

  let resolvedCustomerId = stripeCustomerId ?? null;
  let stripeSubId: string | null = null;
  let memberStatus = planId ? "active" : "trial";

  const stripe = await getStripeClient();

  if (planId && stripe) {
    const plan = await prisma.membershipPlan.findUnique({ where: { id: parseInt(planId, 10) } });

    if (plan?.stripePriceId) {
      // Create customer if we somehow don't have one yet
      if (!resolvedCustomerId) {
        const customer = await stripe.customers.create({ name, email });
        resolvedCustomerId = customer.id;
      }

      // Attach payment method if provided
      if (paymentMethodId) {
        await stripe.paymentMethods.attach(paymentMethodId, { customer: resolvedCustomerId });
        await stripe.customers.update(resolvedCustomerId, {
          invoice_settings: { default_payment_method: paymentMethodId },
        });
      }

      // Re-validate the promo code server-side; an invalid code never blocks enrollment
      let promotionCodeId: string | null = null;
      if (promoCode?.trim()) {
        try {
          const codes = await stripe.promotionCodes.list({ code: promoCode.trim(), active: true, limit: 1 });
          promotionCodeId = codes.data[0]?.id ?? null;
        } catch { /* enroll without discount */ }
      }

      const sub = await stripe.subscriptions.create({
        customer:         resolvedCustomerId,
        items:            [{ price: plan.stripePriceId }],
        ...(promotionCodeId && { discounts: [{ promotion_code: promotionCodeId }] }),
        payment_behavior: "default_incomplete",
        expand:           ["latest_invoice.payment_intent"],
      });

      stripeSubId  = sub.id;
      memberStatus = sub.status === "active" || sub.status === "trialing" ? "active" : "past_due";
    }
  }

  // Create the member record
  const member = await prisma.member.create({
    data: {
      name:            name.trim(),
      email:           email.trim(),
      phone:           phone.trim(),
      dateOfBirth:     dateOfBirth ? new Date(dateOfBirth) : null,
      ageGroup:        ageGroup  || "adult",
      trainingType:    trainingType || null,
      beltRank:        "white",
      status:          memberStatus,
      trialStartedAt:  memberStatus === "trial" ? new Date() : null,
      stripeCustomerId: resolvedCustomerId,
      waiverSignedAt:  new Date(),
    },
  });

  // Update Stripe customer with the new member's DB id in metadata
  if (resolvedCustomerId && stripe) {
    await stripe.customers.update(resolvedCustomerId, { metadata: { memberId: String(member.id) } }).catch(() => {});
  }

  // Create subscription record
  if (planId) {
    await prisma.subscription.create({
      data: {
        memberId:             member.id,
        planId:               parseInt(planId, 10),
        stripeSubscriptionId: stripeSubId,
        status:               memberStatus,
        startDate:            new Date(),
      },
    });
  }

  // Auto-create portal account if email provided and no account already exists
  if (member.email) {
    const existingUser = await prisma.user.findUnique({ where: { email: member.email } });
    if (!existingUser) {
      try {
        const tempPassword = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
        await prisma.user.create({
          data: {
            email:        member.email,
            name:         member.name,
            passwordHash: await bcrypt.hash(tempPassword, 10),
            role:         "member",
            memberId:     member.id,
          },
        });
        await sendEmail(
          member.email,
          "Welcome — your member portal login",
          `<p>Hi ${member.name},</p>
<p>Your account has been created. You can log in to the member portal at <strong>/login</strong>.</p>
<p><strong>Email:</strong> ${member.email}<br>
<strong>Temporary password:</strong> ${tempPassword}</p>
<p>Please change your password after logging in.</p>`
        ).catch(() => {});
      } catch {
        // Account creation failure should never block enrollment
      }
    }
  }

  return NextResponse.json({ success: true, memberId: member.id });
}
