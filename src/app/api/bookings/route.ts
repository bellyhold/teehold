import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const coach = await requireCoach();
  if (!coach) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const bookings = await prisma.booking.findMany({
    where: {
      coachId: coach.id,
      startsAt: { gte: now },
      status: { in: ["confirmed", "pending_payment"] },
    },
    orderBy: { startsAt: "asc" },
    include: {
      lessonType: { select: { name: true, durationMin: true, priceCents: true } },
    },
  });

  const emails = [...new Set(bookings.map((b) => b.clientEmail.toLowerCase()))];
  const notes = await prisma.clientNote.findMany({
    where: { coachId: coach.id, clientEmail: { in: emails } },
  });
  const noteByEmail = Object.fromEntries(notes.map((n) => [n.clientEmail.toLowerCase(), n.note]));

  return NextResponse.json({
    bookings: bookings.map((b) => ({
      ...b,
      clientNote: noteByEmail[b.clientEmail.toLowerCase()] ?? "",
    })),
  });
}
