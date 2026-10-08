import {
  addDays,
  addMinutes,
  format,
  parse,
  isBefore,
  isAfter,
  areIntervalsOverlapping,
} from "date-fns";

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

function tzParts(instant: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = dtf.formatToParts(instant);
  const num = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");
  return {
    year: num("year"),
    month: num("month"),
    day: num("day"),
    hour: num("hour") === 24 ? 0 : num("hour"),
    minute: num("minute"),
    second: num("second"),
  };
}

/**
 * Best-effort: wall-clock `dateKey` + `HH:mm` in an IANA zone → UTC Date.
 * Uses Intl offset correction (DST edges may be off by up to 1h).
 * Falls back to interpreting times in the server's local zone if `timeZone` is invalid.
 */
export function wallTimeToUtc(
  dateKey: string,
  timeHHmm: string,
  timeZone: string,
): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = timeHHmm.split(":").map(Number);
  try {
    const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
    const p = tzParts(new Date(utcGuess), timeZone);
    const asZoneAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
    const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
    return new Date(utcGuess + (desiredAsUtc - asZoneAsUtc));
  } catch {
    // Invalid IANA zone → server local (documented fallback)
    return parse(`${dateKey} ${timeHHmm}`, "yyyy-MM-dd HH:mm", new Date());
  }
}

/** Weekday 0=Sun … 6=Sat for a calendar date in `timeZone`. */
export function weekdayForDateKey(dateKey: string, timeZone: string): number {
  try {
    const noon = wallTimeToUtc(dateKey, "12:00", timeZone);
    const label = new Intl.DateTimeFormat("en-US", {
      timeZone,
      weekday: "short",
    }).format(noon);
    const idx = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(label);
    return idx >= 0 ? idx : noon.getUTCDay();
  } catch {
    return parse(dateKey, "yyyy-MM-dd", new Date()).getDay();
  }
}

/** Inclusive YYYY-MM-DD range (calendar days; not wall-clock 24h steps). */
export function eachDateKey(from: string, to: string): string[] {
  const keys: string[] = [];
  let cursor = parse(from, "yyyy-MM-dd", new Date());
  const end = parse(to, "yyyy-MM-dd", new Date());
  while (!isAfter(cursor, end)) {
    keys.push(format(cursor, "yyyy-MM-dd"));
    cursor = addDays(cursor, 1);
  }
  return keys;
}

/**
 * Generate bookable slot starts for a single calendar day in the coach's local timezone.
 * `day` should be midnight local for that date; times are interpreted as local clock times.
 *
 * Prefer {@link generateSlotsForDateKey} when you have an IANA coach timezone —
 * this helper uses the **server's local timezone** for `day` / `HH:mm` parsing.
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

/**
 * Same as generateSlotsForDay, but wall times are interpreted in `timeZone`
 * (coach IANA zone) and returned as UTC instants.
 */
export function generateSlotsForDateKey(input: {
  dateKey: string; // YYYY-MM-DD
  timeZone: string;
  rules: AvailabilityRuleLike[];
  bookings: BookingLike[];
  durationMin: number;
  bufferMin: number;
  now?: Date;
}): Date[] {
  const { dateKey, timeZone, rules, bookings, durationMin, bufferMin } = input;
  const now = input.now ?? new Date();
  const weekday = weekdayForDateKey(dateKey, timeZone);
  const dayRules = rules.filter((r) => r.weekday === weekday);
  const slots: Date[] = [];

  for (const rule of dayRules) {
    let cursor = wallTimeToUtc(dateKey, rule.startTime, timeZone);
    const windowEnd = wallTimeToUtc(dateKey, rule.endTime, timeZone);

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

/** Format an instant as YYYY-MM-DD in the given IANA zone. */
export function toDateKeyInZone(d: Date, timeZone: string): string {
  try {
    const p = tzParts(d, timeZone);
    return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  } catch {
    return toDateKey(d);
  }
}
