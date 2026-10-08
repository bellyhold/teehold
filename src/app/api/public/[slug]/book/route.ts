import { NextResponse } from "next/server";
import { addMinutes } from "date-fns";
import { nanoid } from "nanoid";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { computeDepositCents, formatUsd } from "@/lib/money";
import {
  BillingNotConfiguredError,
  createDepositCheckoutForBooking,
  stripeConfigured,
} from "@/lib/billing";
import { appUrl } from "@/lib/stripe";
import {
  notifyBookingConfirmed,
  notifyCoachNewBooking,
} from "@/lib/notify";

type Params = { params: Promise<{ slug: string }> };

const bodySchema = z.object({
  startsAt: z.string().datetime(),
  clientName: z.string().trim().min(1).max(120),
  clientEmail: z.string().trim().email().max(200),
  clientPhone: z.string().trim().max(40).optional().nullable(),
});

/** POST /api/public/[slug]/book — create pending_payment booking (+ deposit checkout when Stripe ready). */
export async function POST(req: Request, { params }: Params) {
  const { slug } = await params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { startsAt: startsAtRaw, clientName, clientEmail, clientPhone } =
    parsed.data;
  const startsAt = new Date(startsAtRaw);
  if (Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "Invalid startsAt" }, { status: 400 });
  }
  if (startsAt.getTime() < Date.now() - 60_000) {
    return NextResponse.json(
      { error: "Cannot book a slot in the past" },
      { status: 400 },
    );
  }

  const coach = await prisma.coach.findUnique({
    where: { publicSlug: slug },
    select: {
      id: true,
      email: true,
      name: true,
      businessName: true,
      publicSlug: true,
      lessonDurationMin: true,
      lessonPriceCents: true,
      depositType: true,
      depositFixedCents: true,
      depositPercent: true,
      bufferMin: true,
    },
  });

  if (!coach) {
    return NextResponse.json({ error: "Coach not found" }, { status: 404 });
  }

  const endsAt = addMinutes(startsAt, coach.lessonDurationMin);
  const depositCents = computeDepositCents({
    lessonPriceCents: coach.lessonPriceCents,
    depositType: coach.depositType,
    depositFixedCents: coach.depositFixedCents,
    depositPercent: coach.depositPercent,
  });
  const cancelToken = nanoid(24);

  let booking;
  try {
    booking = await prisma.booking.create({
      data: {
        coachId: coach.id,
        startsAt,
        endsAt,
        clientName,
        clientEmail,
        clientPhone: clientPhone || null,
        status: "pending_payment",
        depositCents,
        depositStatus: "unpaid",
        cancelToken,
      },
    });
  } catch (err: unknown) {
    const code =
      err && typeof err === "object" && "code" in err
        ? String((err as { code: string }).code)
        : "";
    if (code === "P2002") {
      return NextResponse.json(
        { error: "That time slot was just taken. Pick another." },
        { status: 409 },
      );
    }
    throw err;
  }

  let checkoutUrl: string | null = null;
  let message = "Pay deposit next";
  const cancelPath = `/c/cancel/${booking.cancelToken}`;
  const coachLabel = coach.businessName || coach.name;

  if (stripeConfigured()) {
    try {
      const checkout = await createDepositCheckoutForBooking(booking.id);
      checkoutUrl = checkout.url;
      message = "Continue to Stripe Checkout to pay your deposit";
    } catch (err) {
      if (!(err instanceof BillingNotConfiguredError)) {
        console.error("createDepositCheckoutForBooking failed", err);
      }
      message =
        "Booking held — deposit checkout could not start. Pay deposit next (Stripe).";
    }
  } else {
    // Local/dev without Stripe: confirm so coach dashboard + emails still work.
    booking = await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "confirmed" },
    });
    message =
      "Booked (dev mode — Stripe not configured, deposit skipped). Confirmation emailed if Resend is set.";
    await Promise.all([
      notifyBookingConfirmed({
        to: booking.clientEmail,
        coachName: coachLabel,
        startsAt: booking.startsAt,
        depositUsd: formatUsd(booking.depositCents),
        cancelUrl: appUrl(cancelPath),
      }),
      notifyCoachNewBooking({
        to: coach.email,
        clientName: booking.clientName,
        startsAt: booking.startsAt,
      }),
    ]);
  }

  return NextResponse.json(
    {
      bookingId: booking.id,
      cancelToken: booking.cancelToken,
      depositCents: booking.depositCents,
      status: booking.status,
      startsAt: booking.startsAt.toISOString(),
      endsAt: booking.endsAt.toISOString(),
      checkoutUrl,
      message,
      cancelUrl: cancelPath,
    },
    { status: 201 },
  );
}
