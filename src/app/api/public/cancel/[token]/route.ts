import { NextResponse } from "next/server";
import { subHours, isBefore } from "date-fns";
import { prisma } from "@/lib/db";
import { refundBookingDeposit } from "@/lib/billing";
import { formatUsd } from "@/lib/money";

type Params = { params: Promise<{ token: string }> };

/** GET /api/public/cancel/[token] — booking summary for cancel page. */
export async function GET(_req: Request, { params }: Params) {
  const { token } = await params;

  const booking = await prisma.booking.findUnique({
    where: { cancelToken: token },
    include: {
      coach: {
        select: {
          name: true,
          businessName: true,
          publicSlug: true,
          cancellationHours: true,
          timezone: true,
        },
      },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const deadline = subHours(
    booking.startsAt,
    booking.coach.cancellationHours,
  );
  const canCancel =
    (booking.status === "pending_payment" || booking.status === "confirmed") &&
    isBefore(new Date(), deadline);

  return NextResponse.json({
    bookingId: booking.id,
    status: booking.status,
    depositStatus: booking.depositStatus,
    depositCents: booking.depositCents,
    depositLabel: formatUsd(booking.depositCents),
    startsAt: booking.startsAt.toISOString(),
    endsAt: booking.endsAt.toISOString(),
    clientName: booking.clientName,
    clientEmail: booking.clientEmail,
    cancellationHours: booking.coach.cancellationHours,
    cancelDeadline: deadline.toISOString(),
    canCancel,
    refundNote:
      "Eligible cancels refund a paid deposit via Stripe when configured.",
    coach: {
      name: booking.coach.name,
      businessName: booking.coach.businessName,
      slug: booking.coach.publicSlug,
      timezone: booking.coach.timezone,
    },
  });
}

/**
 * POST /api/public/cancel/[token] — cancel when before cancellationHours.
 * Sets status=canceled. Refund processing is Agent C / Stripe.
 */
export async function POST(_req: Request, { params }: Params) {
  const { token } = await params;

  const booking = await prisma.booking.findUnique({
    where: { cancelToken: token },
    include: {
      coach: { select: { cancellationHours: true, publicSlug: true } },
    },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (booking.status === "canceled") {
    return NextResponse.json({
      ok: true,
      status: "canceled",
      message: "Booking already canceled",
      refundNote: "Already canceled",
    });
  }

  if (booking.status !== "pending_payment" && booking.status !== "confirmed") {
    return NextResponse.json(
      { error: `Cannot cancel a ${booking.status} booking` },
      { status: 400 },
    );
  }

  const deadline = subHours(
    booking.startsAt,
    booking.coach.cancellationHours,
  );
  if (!isBefore(new Date(), deadline)) {
    return NextResponse.json(
      {
        error: `Cancellations must be at least ${booking.coach.cancellationHours} hours before the lesson`,
        cancelDeadline: deadline.toISOString(),
      },
      { status: 400 },
    );
  }

  const refund =
    booking.depositStatus === "paid"
      ? await refundBookingDeposit(booking.id)
      : { refunded: false, reason: "No paid deposit" };

  const updated = await prisma.booking.update({
    where: { id: booking.id },
    data: { status: "canceled" },
  });

  return NextResponse.json({
    ok: true,
    bookingId: updated.id,
    status: updated.status,
    message: "Booking canceled",
    refund,
    coachSlug: booking.coach.publicSlug,
  });
}
