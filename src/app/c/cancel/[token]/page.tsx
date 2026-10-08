import { notFound } from "next/navigation";
import { subHours, isBefore } from "date-fns";
import { prisma } from "@/lib/db";
import { formatUsd } from "@/lib/money";
import { CancelClient } from "./CancelClient";

type Props = { params: Promise<{ token: string }> };

export const metadata = {
  title: "Cancel booking · TeeHold",
};

export default async function CancelBookingPage({ params }: Props) {
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

  if (!booking) notFound();

  const deadline = subHours(
    booking.startsAt,
    booking.coach.cancellationHours,
  );
  const canCancel =
    (booking.status === "pending_payment" || booking.status === "confirmed") &&
    isBefore(new Date(), deadline);

  return (
    <CancelClient
      token={token}
      initial={{
        bookingId: booking.id,
        status: booking.status,
        depositStatus: booking.depositStatus,
        depositLabel: formatUsd(booking.depositCents),
        startsAt: booking.startsAt.toISOString(),
        cancellationHours: booking.coach.cancellationHours,
        cancelDeadline: deadline.toISOString(),
        canCancel,
        refundNote:
          "Deposit refunds (if eligible) are handled by Stripe billing — Agent C.",
        clientName: booking.clientName,
        coach: {
          name: booking.coach.name,
          businessName: booking.coach.businessName,
          slug: booking.coach.publicSlug,
          timezone: booking.coach.timezone,
        },
      }}
    />
  );
}
