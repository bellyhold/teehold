import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const coach = await requireCoach();
  if (!coach) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  return NextResponse.json({ rules, exceptions });
}
