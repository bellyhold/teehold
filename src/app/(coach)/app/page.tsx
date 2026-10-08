import { requireCoach } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { UpcomingList } from "./upcoming-list";

export default async function UpcomingPage() {
  const coach = await requireCoach();
  if (!coach) redirect("/login");

  const now = new Date();
  const bookings = await prisma.booking.findMany({
    where: {
      coachId: coach.id,
      startsAt: { gte: now },
      status: { in: ["confirmed", "pending_payment"] },
    },
    orderBy: { startsAt: "asc" },
    include: {
      lessonType: { select: { name: true } },
    },
  });

  const emails = [...new Set(bookings.map((b) => b.clientEmail.toLowerCase()))];
  const notes = emails.length
    ? await prisma.clientNote.findMany({
        where: { coachId: coach.id, clientEmail: { in: emails } },
      })
    : [];
  const noteByEmail = Object.fromEntries(
    notes.map((n) => [n.clientEmail.toLowerCase(), n.note]),
  );

  const rows = bookings.map((b) => ({
    id: b.id,
    clientName: b.clientName,
    clientEmail: b.clientEmail,
    clientPhone: b.clientPhone,
    startsAt: b.startsAt.toISOString(),
    endsAt: b.endsAt.toISOString(),
    status: b.status,
    depositCents: b.depositCents,
    depositStatus: b.depositStatus,
    lessonName: b.lessonType?.name ?? "Lesson",
    clientNote: noteByEmail[b.clientEmail.toLowerCase()] ?? "",
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Upcoming lessons</h1>
      <p className="mt-2 text-sm text-white/60">
        Confirmed and pending bookings from now onward.
      </p>
      <UpcomingList initial={rows} timezone={coach.timezone} />
    </div>
  );
}
