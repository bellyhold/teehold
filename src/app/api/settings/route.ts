import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCoach } from "@/lib/auth";
import { prisma } from "@/lib/db";

const patchSchema = z.object({
  businessName: z.string().trim().max(120).optional().nullable(),
  timezone: z.string().trim().min(1).max(64).optional(),
  lessonDurationMin: z.number().int().min(15).max(480).optional(),
  lessonPriceCents: z.number().int().min(0).max(100_000_000).optional(),
  depositType: z.enum(["fixed", "percent"]).optional(),
  depositFixedCents: z.number().int().min(0).max(100_000_000).optional(),
  depositPercent: z.number().int().min(1).max(100).optional(),
  bufferMin: z.number().int().min(0).max(180).optional(),
  cancellationHours: z.number().int().min(0).max(168).optional(),
});

export async function GET() {
  const coach = await requireCoach();
  if (!coach) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return NextResponse.json({
    settings: {
      businessName: coach.businessName,
      name: coach.name,
      timezone: coach.timezone,
      lessonDurationMin: coach.lessonDurationMin,
      lessonPriceCents: coach.lessonPriceCents,
      depositType: coach.depositType,
      depositFixedCents: coach.depositFixedCents,
      depositPercent: coach.depositPercent,
      bufferMin: coach.bufferMin,
      cancellationHours: coach.cancellationHours,
      publicSlug: coach.publicSlug,
      publicLink: `${appUrl}/c/${coach.publicSlug}`,
    },
  });
}

export async function PATCH(req: Request) {
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

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const updated = await prisma.coach.update({
    where: { id: coach.id },
    data: {
      ...(data.businessName !== undefined ? { businessName: data.businessName } : {}),
      ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
      ...(data.lessonDurationMin !== undefined
        ? { lessonDurationMin: data.lessonDurationMin }
        : {}),
      ...(data.lessonPriceCents !== undefined
        ? { lessonPriceCents: data.lessonPriceCents }
        : {}),
      ...(data.depositType !== undefined ? { depositType: data.depositType } : {}),
      ...(data.depositFixedCents !== undefined
        ? { depositFixedCents: data.depositFixedCents }
        : {}),
      ...(data.depositPercent !== undefined ? { depositPercent: data.depositPercent } : {}),
      ...(data.bufferMin !== undefined ? { bufferMin: data.bufferMin } : {}),
      ...(data.cancellationHours !== undefined
        ? { cancellationHours: data.cancellationHours }
        : {}),
    },
  });

  // Keep the active default lesson type in sync with coach lesson defaults
  if (
    data.lessonDurationMin !== undefined ||
    data.lessonPriceCents !== undefined
  ) {
    const primary = await prisma.lessonType.findFirst({
      where: { coachId: coach.id, isActive: true },
      orderBy: { id: "asc" },
    });
    if (primary) {
      await prisma.lessonType.update({
        where: { id: primary.id },
        data: {
          ...(data.lessonDurationMin !== undefined
            ? { durationMin: data.lessonDurationMin }
            : {}),
          ...(data.lessonPriceCents !== undefined
            ? { priceCents: data.lessonPriceCents }
            : {}),
        },
      });
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return NextResponse.json({
    settings: {
      businessName: updated.businessName,
      name: updated.name,
      timezone: updated.timezone,
      lessonDurationMin: updated.lessonDurationMin,
      lessonPriceCents: updated.lessonPriceCents,
      depositType: updated.depositType,
      depositFixedCents: updated.depositFixedCents,
      depositPercent: updated.depositPercent,
      bufferMin: updated.bufferMin,
      cancellationHours: updated.cancellationHours,
      publicSlug: updated.publicSlug,
      publicLink: `${appUrl}/c/${updated.publicSlug}`,
    },
  });
}
