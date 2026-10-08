import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCoach } from "@/lib/auth";
import { prisma } from "@/lib/db";

const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;

function normalizeTime(v: string) {
  // Browsers may send HH:mm:ss from <input type="time">
  return v.slice(0, 5);
}

const ruleSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: z
    .string()
    .transform(normalizeTime)
    .pipe(z.string().regex(timeRe, "startTime must be HH:mm")),
  endTime: z
    .string()
    .transform(normalizeTime)
    .pipe(z.string().regex(timeRe, "endTime must be HH:mm")),
  locationLabel: z.string().trim().max(120).optional().nullable(),
});

const putSchema = z.object({
  rules: z.array(ruleSchema).max(50),
});

export async function PUT(req: Request) {
  const coach = await requireCoach();
  if (!coach) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  for (const rule of parsed.data.rules) {
    if (rule.startTime >= rule.endTime) {
      return NextResponse.json(
        { error: `Invalid window on weekday ${rule.weekday}: start must be before end` },
        { status: 400 },
      );
    }
  }

  const rules = await prisma.$transaction(async (tx) => {
    await tx.availabilityRule.deleteMany({ where: { coachId: coach.id } });
    if (parsed.data.rules.length === 0) return [];
    await tx.availabilityRule.createMany({
      data: parsed.data.rules.map((r) => ({
        coachId: coach.id,
        weekday: r.weekday,
        startTime: r.startTime,
        endTime: r.endTime,
        locationLabel: r.locationLabel ?? null,
      })),
    });
    return tx.availabilityRule.findMany({
      where: { coachId: coach.id },
      orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
    });
  });

  return NextResponse.json({ rules });
}
