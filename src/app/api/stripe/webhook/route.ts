import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { stripeWebhookSecretConfigured } from "@/lib/billing";
import { getStripe, stripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const type = session.metadata?.type;

  if (type === "subscription" || session.mode === "subscription") {
    const coachId = session.metadata?.coachId;
    if (!coachId) return;

    const customerId =
      typeof session.customer === "string"
        ? session.customer
        : session.customer?.id ?? null;
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null;

    await prisma.coach.update({
      where: { id: coachId },
      data: {
        plan: "active",
        ...(customerId ? { stripeCustomerId: customerId } : {}),
        ...(subscriptionId ? { stripeSubscriptionId: subscriptionId } : {}),
      },
    });
    return;
  }

  if (type === "deposit" || session.metadata?.bookingId) {
    const bookingId = session.metadata?.bookingId;
    if (!bookingId) return;

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: "confirmed",
        depositStatus: "paid",
        stripeCheckoutSessionId: session.id,
        ...(paymentIntentId
          ? { stripePaymentIntentId: paymentIntentId }
          : {}),
      },
    });
  }
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const coachId = sub.metadata?.coachId;
  if (coachId) {
    await prisma.coach.update({
      where: { id: coachId },
      data: { plan: "canceled" },
    });
    return;
  }

  const coach = await prisma.coach.findFirst({
    where: { stripeSubscriptionId: sub.id },
  });
  if (coach) {
    await prisma.coach.update({
      where: { id: coach.id },
      data: { plan: "canceled" },
    });
  }
}

export async function POST(req: Request) {
  if (!stripeConfigured()) {
    return NextResponse.json(
      {
        error: "Stripe is not configured",
        hint: "Set STRIPE_SECRET_KEY (must not contain 'replace').",
      },
      { status: 503 }
    );
  }

  const stripe = getStripe();
  const body = await req.text();
  let event: Stripe.Event;

  if (stripeWebhookSecretConfigured()) {
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Invalid signature";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  } else {
    // Dev-friendly: accept unsigned payloads when webhook secret is a placeholder.
    try {
      event = JSON.parse(body) as Stripe.Event;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;
      default:
        break;
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Webhook handler failed";
    console.error("[stripe webhook]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
