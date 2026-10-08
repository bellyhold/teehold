"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

export type CancelBooking = {
  bookingId: string;
  status: string;
  depositStatus: string;
  depositLabel: string;
  startsAt: string;
  cancellationHours: number;
  cancelDeadline: string;
  canCancel: boolean;
  refundNote: string;
  clientName: string;
  coach: {
    name: string;
    businessName: string | null;
    slug: string;
    timezone: string;
  };
};

function formatWhen(iso: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

export function CancelClient({
  token,
  initial,
}: {
  token: string;
  initial: CancelBooking;
}) {
  const [booking, setBooking] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const brand = booking.coach.businessName?.trim() || booking.coach.name;

  function onCancel() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/public/cancel/${token}`, {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Could not cancel");
          return;
        }
        setBooking((b) => ({
          ...b,
          status: "canceled",
          canCancel: false,
          refundNote: data.refundNote ?? b.refundNote,
        }));
      } catch {
        setError("Network error — try again");
      }
    });
  }

  return (
    <div className="min-h-dvh bg-[radial-gradient(100%_70%_at_50%_-20%,#2a6b45_0%,transparent_55%),var(--tee-ink)]">
      <main className="mx-auto max-w-lg px-4 py-12">
        <p className="text-xs uppercase tracking-[0.25em] text-[var(--tee-moss)]">
          TeeHold
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          {booking.status === "canceled"
            ? "Booking canceled"
            : "Cancel booking"}
        </h1>
        <p className="mt-2 text-white/65">
          {brand} · {booking.clientName}
        </p>

        <dl className="mt-8 space-y-3 border-t border-white/10 pt-6 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-white/50">When</dt>
            <dd className="text-right">
              {formatWhen(booking.startsAt, booking.coach.timezone)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-white/50">Deposit</dt>
            <dd className="text-right">
              {booking.depositLabel}{" "}
              <span className="text-white/45">({booking.depositStatus})</span>
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-white/50">Status</dt>
            <dd className="text-right capitalize">
              {booking.status.replace("_", " ")}
            </dd>
          </div>
        </dl>

        {booking.status === "canceled" ? (
          <p className="mt-6 rounded-lg bg-white/5 px-4 py-3 text-sm text-white/75">
            {booking.refundNote}
          </p>
        ) : booking.canCancel ? (
          <>
            <p className="mt-6 text-sm text-white/60">
              Free cancellation until{" "}
              {formatWhen(booking.cancelDeadline, booking.coach.timezone)}.
              Deposit refunds (if paid) are handled via Stripe.
            </p>
            {error ? (
              <p className="mt-3 text-sm text-[var(--tee-clay)]">{error}</p>
            ) : null}
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="mt-6 w-full rounded-xl border border-[var(--tee-clay)]/50 bg-[var(--tee-clay)]/20 px-4 py-3.5 font-semibold text-[var(--tee-sand)] transition hover:bg-[var(--tee-clay)]/35 disabled:opacity-40"
            >
              {pending ? "Canceling…" : "Cancel lesson"}
            </button>
          </>
        ) : (
          <p className="mt-6 rounded-lg bg-white/5 px-4 py-3 text-sm text-white/75">
            This booking can no longer be canceled online (must cancel at least{" "}
            {booking.cancellationHours} hours ahead). Contact {brand} directly.
          </p>
        )}

        <Link
          href={`/c/${booking.coach.slug}`}
          className="mt-10 inline-block text-sm text-[var(--tee-moss)] underline-offset-4 hover:underline"
        >
          Back to booking page
        </Link>
      </main>
    </div>
  );
}
