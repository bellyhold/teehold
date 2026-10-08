import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  eachDateKey,
  generateSlotsForDateKey,
  toDateKeyInZone,
} from "@/lib/slots";

type Params = { params: Promise<{ slug: string }> };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/public/[slug]/slots?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Slot wall-clock times use the coach's IANA timezone (best-effort via Intl).
 * Returned `startsAt` values are ISO UTC instants.
 */
export async function GET(req: Request, { params }: Params) {
  const { slug } = await params;
  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";

  if (!DATE_RE.test(from) || !DATE_RE.test(to)) {
    return NextResponse.json(
      { error: "Query params from and to are required as YYYY-MM-DD" },
      { status: 400 },
    );
  }
  if (from > to) {
    return NextResponse.json(
      { error: "`from` must be on or before `to`" },
      { status: 400 },
    );
  }

  const coach = await prisma.coach.findUnique({
    where: { publicSlug: slug },
    select: {
      id: true,
      timezone: true,
      lessonDurationMin: true,
      bufferMin: true,
      availabilityRules: {
        select: { weekday: true, startTime: true, endTime: true },
      },
      availabilityExceptions: {
        where: { date: { gte: from, lte: to } },
        select: { date: true, isBlocked: true },
      },
    },
  });

  if (!coach) {
    return NextResponse.json({ error: "Coach not found" }, { status: 404 });
  }

  const rangeStart = new Date(`${from}T00:00:00.000Z`);
  const rangeEnd = new Date(`${to}T23:59:59.999Z`);
  // Pad so timezone shifts still catch overlapping bookings
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 1);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1);

  const bookings = await prisma.booking.findMany({
    where: {
      coachId: coach.id,
      status: { in: ["pending_payment", "confirmed"] },
      startsAt: { lte: rangeEnd },
      endsAt: { gte: rangeStart },
    },
    select: { startsAt: true, endsAt: true },
  });

  const blockedDates = new Set(
    coach.availabilityExceptions.filter((e) => e.isBlocked).map((e) => e.date),
  );

  const days: { date: string; slots: string[] }[] = [];
  const now = new Date();

  for (const dateKey of eachDateKey(from, to)) {
    if (blockedDates.has(dateKey)) {
      days.push({ date: dateKey, slots: [] });
      continue;
    }

    const slots = generateSlotsForDateKey({
      dateKey,
      timeZone: coach.timezone,
      rules: coach.availabilityRules,
      bookings,
      durationMin: coach.lessonDurationMin,
      bufferMin: coach.bufferMin,
      now,
    });

    days.push({
      date: dateKey,
      slots: slots.map((s) => s.toISOString()),
    });
  }

  return NextResponse.json({
    slug,
    timezone: coach.timezone,
    from,
    to,
    /** Slot times are coach-zone wall clocks converted to UTC ISO. */
    timezoneNote:
      "Wall-clock availability is interpreted in the coach IANA timezone via Intl (best-effort). Invalid zones fall back to server local.",
    todayInCoachZone: toDateKeyInZone(now, coach.timezone),
    days,
  });
}
