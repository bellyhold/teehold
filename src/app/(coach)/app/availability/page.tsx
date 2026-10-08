import { requireCoach } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { AvailabilityEditor } from "./availability-editor";

export default async function AvailabilityPage() {
  const coach = await requireCoach();
  if (!coach) redirect("/login");

  const [rules, exceptions] = await Promise.all([
    prisma.availabilityRule.findMany({
      where: { coachId: coach.id },
      orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
    }),
    prisma.availabilityException.findMany({
      where: { coachId: coach.id },
      orderBy: { date: "asc" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Availability</h1>
      <p className="mt-2 text-sm text-white/60">
        Weekly hours and blocked dates for your public booking page.
      </p>
      <AvailabilityEditor
        initialRules={rules.map((r) => ({
          weekday: r.weekday,
          startTime: r.startTime,
          endTime: r.endTime,
          locationLabel: r.locationLabel,
        }))}
        initialExceptions={exceptions.map((e) => ({
          id: e.id,
          date: e.date,
          isBlocked: e.isBlocked,
        }))}
      />
    </div>
  );
}
