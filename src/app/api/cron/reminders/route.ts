import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendBookingReminder } from "@/lib/email";

export const dynamic = "force-dynamic";

function authorize(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;

  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;

  const header = request.headers.get("x-cron-secret");
  if (header === secret) return true;

  return false;
}

async function runReminders() {
  const now = new Date();

  const candidates = await prisma.booking.findMany({
    where: {
      status: "confirmed",
      reminderSentAt: null,
      startsAt: { gt: now },
    },
    include: {
      coach: {
        select: {
          name: true,
          reminderHoursBefore: true,
        },
      },
    },
    take: 200,
  });

  const due = candidates.filter((booking) => {
    const windowMs = booking.coach.reminderHoursBefore * 60 * 60 * 1000;
    const windowStart = new Date(booking.startsAt.getTime() - windowMs);
    return windowStart <= now;
  });

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const booking of due) {
    const result = await sendBookingReminder({
      to: booking.clientEmail,
      coachName: booking.coach.name,
      startsAt: booking.startsAt,
    });

    if (!result.ok) {
      failed += 1;
      errors.push(`${booking.id}: ${result.error}`);
      continue;
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: { reminderSentAt: now },
    });
    sent += 1;
  }

  return {
    ok: true as const,
    scanned: candidates.length,
    due: due.length,
    sent,
    failed,
    errors: errors.length ? errors : undefined,
  };
}

async function handle(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runReminders();
    return NextResponse.json(result);
  } catch (err) {
    console.error("[cron/reminders]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Reminder cron failed" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
