import { prisma } from "@/lib/db";
import { appUrl, getStripe, stripeConfigured } from "@/lib/stripe";

export { stripeConfigured };

export class BillingNotConfiguredError extends Error {
  constructor(message = "Stripe is not configured") {
    super(message);
    this.name = "BillingNotConfiguredError";
  }
}

function requireStripe() {
  if (!stripeConfigured()) {
    throw new BillingNotConfiguredError(
      "Stripe is not configured. Set STRIPE_SECRET_KEY (non-placeholder)."
    );
  }
  return getStripe();
}

function priceId(interval: "monthly" | "yearly"): string {
  const id =
    interval === "yearly"
      ? process.env.STRIPE_PRICE_YEARLY
      : process.env.STRIPE_PRICE_MONTHLY;
  if (!id || id.includes("replace")) {
    throw new BillingNotConfiguredError(
      interval === "yearly"
        ? "STRIPE_PRICE_YEARLY is not configured"
        : "STRIPE_PRICE_MONTHLY is not configured"
    );
  }
  return id;
}

function webhookSecretConfigured(): boolean {
  const s = process.env.STRIPE_WEBHOOK_SECRET;
  return Boolean(s && !s.includes("replace"));
}

export function stripeWebhookSecretConfigured(): boolean {
  return webhookSecretConfigured();
}

/** SaaS Checkout: $39/mo (or yearly price) for a coach. */
export async function createCoachSubscriptionCheckout(
  coachId: string,
  interval: "monthly" | "yearly" = "monthly"
): Promise<{ url: string }> {
  const stripe = requireStripe();
  const coach = await prisma.coach.findUnique({ where: { id: coachId } });
  if (!coach) throw new Error("Coach not found");

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: coach.stripeCustomerId ?? undefined,
    customer_email: coach.stripeCustomerId ? undefined : coach.email,
    line_items: [{ price: priceId(interval), quantity: 1 }],
    success_url: appUrl("/app/billing?success=1"),
    cancel_url: appUrl("/app/billing?canceled=1"),
    metadata: {
      type: "subscription",
      coachId: coach.id,
      interval,
    },
    subscription_data: {
      metadata: {
        coachId: coach.id,
      },
    },
  });

  if (!session.url) throw new Error("Stripe did not return a Checkout URL");
  return { url: session.url };
}

/** Stripe Customer Billing Portal for plan management. */
export async function createBillingPortal(
  coachId: string
): Promise<{ url: string }> {
  const stripe = requireStripe();
  const coach = await prisma.coach.findUnique({ where: { id: coachId } });
  if (!coach) throw new Error("Coach not found");
  if (!coach.stripeCustomerId) {
    throw new Error("No Stripe customer yet — subscribe first");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: coach.stripeCustomerId,
    return_url: appUrl("/app/billing"),
  });

  return { url: session.url };
}

/**
 * Deposit Checkout for a booking.
 * Uses Connect destination charge when the coach has an Express account;
 * otherwise charges the platform account (webhook still marks deposit paid).
 */
export async function createDepositCheckout(input: {
  bookingId: string;
}): Promise<{ url: string; sessionId: string }> {
  const stripe = requireStripe();
  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: { coach: true, lessonType: true },
  });
  if (!booking) throw new Error("Booking not found");
  if (booking.depositStatus === "paid") {
    throw new Error("Deposit already paid");
  }
  if (booking.depositCents < 50) {
    throw new Error("Deposit amount too small for Stripe Checkout");
  }

  const coach = booking.coach;
  const lessonLabel = booking.lessonType?.name ?? "Lesson";
  const connectId = coach.stripeConnectAccountId;

  const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
    mode: "payment",
    customer_email: booking.clientEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: booking.depositCents,
          product_data: {
            name: `Deposit — ${lessonLabel} with ${coach.name}`,
            description: `Booking deposit for ${booking.clientName}`,
          },
        },
      },
    ],
    success_url: appUrl(`/c/${coach.publicSlug}?paid=1`),
    cancel_url: appUrl(`/c/${coach.publicSlug}?canceled=1`),
    metadata: {
      type: "deposit",
      bookingId: booking.id,
      coachId: coach.id,
    },
    payment_intent_data: {
      metadata: {
        type: "deposit",
        bookingId: booking.id,
        coachId: coach.id,
      },
    },
  };

  if (connectId) {
    sessionParams.payment_intent_data = {
      ...sessionParams.payment_intent_data,
      transfer_data: { destination: connectId },
    };
  }

  const session = await stripe.checkout.sessions.create(sessionParams);
  if (!session.url) throw new Error("Stripe did not return a Checkout URL");

  await prisma.booking.update({
    where: { id: booking.id },
    data: { stripeCheckoutSessionId: session.id },
  });

  return { url: session.url, sessionId: session.id };
}

/** Alias for Agent B public booking flow. */
export async function createDepositCheckoutForBooking(
  bookingId: string
): Promise<{ url: string; sessionId: string }> {
  return createDepositCheckout({ bookingId });
}

/** Stripe Connect Express onboarding account link. */
export async function createConnectOnboardingLink(
  coachId: string
): Promise<{ url: string }> {
  const stripe = requireStripe();
  const coach = await prisma.coach.findUnique({ where: { id: coachId } });
  if (!coach) throw new Error("Coach not found");

  let accountId = coach.stripeConnectAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: coach.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_profile: {
        name: coach.businessName ?? coach.name,
        product_description: "Golf lesson coaching deposits",
      },
      metadata: { coachId: coach.id },
    });
    accountId = account.id;
    await prisma.coach.update({
      where: { id: coach.id },
      data: { stripeConnectAccountId: accountId },
    });
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: appUrl("/app/billing?connect=refresh"),
    return_url: appUrl("/app/billing?connect=done"),
    type: "account_onboarding",
  });

  return { url: link.url };
}
