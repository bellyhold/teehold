import { addMinutes, format, parse, isBefore, isAfter, areIntervalsOverlapping } from "date-fns";

export type TimeRange = { start: Date; end: Date };

export type AvailabilityRuleLike = {
  weekday: number;
  startTime: string; // HH:mm
  endTime: string;
};

export type BookingLike = {
  startsAt: Date;
  endsAt: Date;
};

/**
 * Generate bookable slot starts for a single calendar day in the coach's local timezone.
 * `day` should be midnight local for that date; times are interpreted as local clock times.
 */
export function generateSlotsForDay(input: {
  day: Date; // local date at 00:00
  rules: AvailabilityRuleLike[];
  bookings: BookingLike[];
  durationMin: number;
  bufferMin: number;
  now?: Date;
}): Date[] {
  const { day, rules, bookings, durationMin, bufferMin } = input;
  const now = input.now ?? new Date();
  const weekday = day.getDay();
  const dayRules = rules.filter((r) => r.weekday === weekday);
  const slots: Date[] = [];

  for (const rule of dayRules) {
    let cursor = parse(rule.startTime, "HH:mm", day);
    const windowEnd = parse(rule.endTime, "HH:mm", day);

    while (true) {
      const slotEnd = addMinutes(cursor, durationMin);
      if (isAfter(slotEnd, windowEnd)) break;

      const blocked = bookings.some((b) =>
        areIntervalsOverlapping(
          { start: cursor, end: addMinutes(slotEnd, bufferMin) },
          { start: b.startsAt, end: addMinutes(b.endsAt, bufferMin) },
          { inclusive: true },
        ),
      );

      if (!blocked && !isBefore(cursor, now)) {
        slots.push(cursor);
      }

      cursor = addMinutes(cursor, durationMin + bufferMin);
    }
  }

  return slots;
}

export function toDateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}
