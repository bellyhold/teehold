"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { formatUsd } from "@/lib/money";

export type PublicCoach = {
  slug: string;
  name: string;
  businessName: string | null;
  bio: string | null;
  photoUrl: string | null;
  timezone: string;
  lessonDurationMin: number;
  lessonPriceCents: number;
  depositCents: number;
  cancellationHours: number;
  cancellationPolicy: string;
};

type DaySlots = { date: string; slots: string[] };

type BookResult = {
  bookingId: string;
  cancelToken: string;
  depositCents: number;
  startsAt: string;
  endsAt: string;
  checkoutUrl: string | null;
  message: string;
  cancelUrl: string;
};

function addDaysKey(from: Date, days: number): string {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function formatSlotTime(iso: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }
}

function formatSlotFull(iso: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

function formatDayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(y, m - 1, d));
}

export function BookingClient({
  coach,
  paidFlag,
}: {
  coach: PublicCoach;
  paidFlag?: boolean;
}) {
  const brand = coach.businessName?.trim() || coach.name;
  const from = useMemo(() => addDaysKey(new Date(), 0), []);
  const to = useMemo(() => addDaysKey(new Date(), 20), []);

  const [days, setDays] = useState<DaySlots[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [result, setResult] = useState<BookResult | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setSlotsLoading(true);
    setSlotsError(null);
    fetch(`/api/public/${coach.slug}/slots?from=${from}&to=${to}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load slots");
        if (!cancelled) {
          setDays(data.days ?? []);
          const firstOpen = (data.days as DaySlots[]).find(
            (d) => d.slots.length > 0,
          );
          if (firstOpen) setSelectedDate(firstOpen.date);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setSlotsError(err.message);
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [coach.slug, from, to]);

  const openDays = days.filter((d) => d.slots.length > 0);
  const daySlots =
    days.find((d) => d.date === selectedDate)?.slots ?? [];

  function onBook(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) {
      setFormError("Pick a time slot");
      return;
    }
    setFormError(null);
    startTransition(async () => {
      try {
        const res = await fetch(`/api/public/${coach.slug}/book`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startsAt: selectedSlot,
            clientName,
            clientEmail,
            clientPhone: clientPhone || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setFormError(data.error || "Could not book");
          return;
        }
        setResult(data as BookResult);
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl as string;
        }
      } catch {
        setFormError("Network error — try again");
      }
    });
  }

  if (result && !result.checkoutUrl) {
    return (
      <section className="mx-auto max-w-lg px-4 py-10">
        <p className="text-sm uppercase tracking-[0.2em] text-[var(--tee-moss)]">
          TeeHold
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          You&apos;re on the calendar
        </h1>
        <p className="mt-2 text-white/70">
          Lesson held with {brand}. Deposit checkout wires via Stripe (Agent C).
        </p>
        <dl className="mt-8 space-y-3 border-t border-white/10 pt-6 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-white/50">When</dt>
            <dd className="text-right">
              {formatSlotFull(result.startsAt, coach.timezone)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-white/50">Deposit due</dt>
            <dd className="text-right text-[var(--tee-moss)]">
              {formatUsd(result.depositCents)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-white/50">Status</dt>
            <dd className="text-right">Pending payment</dd>
          </div>
        </dl>
        <p className="mt-6 rounded-lg bg-white/5 px-4 py-3 text-sm text-white/75">
          {result.message}
        </p>
        <a
          href={result.cancelUrl}
          className="mt-8 inline-block text-sm text-[var(--tee-sand)] underline-offset-4 hover:underline"
        >
          Cancel this booking
        </a>
      </section>
    );
  }

  return (
    <div className="min-h-dvh bg-[radial-gradient(120%_80%_at_10%_-10%,#2a6b45_0%,transparent_55%),radial-gradient(90%_60%_at_100%_0%,#1a3d2a_0%,transparent_50%),var(--tee-ink)]">
      <header className="border-b border-white/10 px-4 py-4">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-[0.25em] text-[var(--tee-moss)]">
            TeeHold
          </span>
          <span className="text-xs text-white/45">{coach.timezone}</span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-16 pt-8">
        {paidFlag ? (
          <p className="mb-6 rounded-lg border border-[var(--tee-fairway)]/40 bg-[var(--tee-fairway)]/15 px-4 py-3 text-sm text-[var(--tee-moss)]">
            Deposit payment received — see you on the tee.
          </p>
        ) : null}

        <p className="text-sm text-white/55">Book a lesson with</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight text-white">
          {brand}
        </h1>
        {coach.businessName && coach.businessName !== coach.name ? (
          <p className="mt-1 text-white/60">{coach.name}</p>
        ) : null}
        {coach.bio ? (
          <p className="mt-4 text-sm leading-relaxed text-white/70">{coach.bio}</p>
        ) : null}

        <div className="mt-8 grid grid-cols-3 gap-3 text-center text-sm">
          <div className="rounded-xl bg-white/5 px-2 py-3">
            <div className="text-white/45">Lesson</div>
            <div className="mt-1 font-medium text-white">
              {formatUsd(coach.lessonPriceCents)}
            </div>
          </div>
          <div className="rounded-xl bg-white/5 px-2 py-3">
            <div className="text-white/45">Length</div>
            <div className="mt-1 font-medium text-white">
              {coach.lessonDurationMin} min
            </div>
          </div>
          <div className="rounded-xl bg-white/5 px-2 py-3">
            <div className="text-white/45">Deposit</div>
            <div className="mt-1 font-medium text-[var(--tee-moss)]">
              {formatUsd(coach.depositCents)}
            </div>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-white/45">
          {coach.cancellationPolicy}
        </p>

        <section className="mt-10">
          <h2 className="text-lg font-medium text-white">Pick a day</h2>
          <p className="mt-1 text-sm text-white/50">
            Open times for the next three weeks
          </p>

          {slotsLoading ? (
            <p className="mt-6 text-sm text-white/50">Loading availability…</p>
          ) : slotsError ? (
            <p className="mt-6 text-sm text-[var(--tee-clay)]">{slotsError}</p>
          ) : openDays.length === 0 ? (
            <p className="mt-6 text-sm text-white/50">
              No open slots in this window. Check back soon.
            </p>
          ) : (
            <>
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {openDays.map((d) => {
                  const active = d.date === selectedDate;
                  return (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => {
                        setSelectedDate(d.date);
                        setSelectedSlot(null);
                      }}
                      className={`shrink-0 rounded-xl px-3 py-2 text-left text-sm transition ${
                        active
                          ? "bg-[var(--tee-fairway)] text-white"
                          : "bg-white/5 text-white/80 hover:bg-white/10"
                      }`}
                    >
                      <div className="font-medium">
                        {formatDayLabel(d.date)}
                      </div>
                      <div className="text-xs opacity-70">
                        {d.slots.length} open
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {daySlots.map((iso) => {
                  const active = iso === selectedSlot;
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setSelectedSlot(iso)}
                      className={`rounded-lg px-2 py-3 text-sm font-medium transition ${
                        active
                          ? "bg-[var(--tee-sand)] text-[var(--tee-ink)]"
                          : "bg-white/5 text-white hover:bg-white/10"
                      }`}
                    >
                      {formatSlotTime(iso, coach.timezone)}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-medium text-white">Your details</h2>
          <form onSubmit={onBook} className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="text-white/55">Name</span>
              <input
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-white outline-none focus:border-[var(--tee-fairway)]"
                autoComplete="name"
              />
            </label>
            <label className="block text-sm">
              <span className="text-white/55">Email</span>
              <input
                required
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-white outline-none focus:border-[var(--tee-fairway)]"
                autoComplete="email"
              />
            </label>
            <label className="block text-sm">
              <span className="text-white/55">Phone (optional)</span>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-3 text-white outline-none focus:border-[var(--tee-fairway)]"
                autoComplete="tel"
              />
            </label>

            {selectedSlot ? (
              <p className="text-sm text-white/70">
                Holding{" "}
                <span className="text-[var(--tee-moss)]">
                  {formatSlotFull(selectedSlot, coach.timezone)}
                </span>{" "}
                · deposit {formatUsd(coach.depositCents)}
              </p>
            ) : null}

            {formError ? (
              <p className="text-sm text-[var(--tee-clay)]">{formError}</p>
            ) : null}

            <button
              type="submit"
              disabled={pending || !selectedSlot}
              className="w-full rounded-xl bg-[var(--tee-fairway)] px-4 py-3.5 text-base font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {pending ? "Booking…" : "Book & pay deposit"}
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
