import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCoach } from "@/lib/auth";
import { prisma } from "@/lib/db";

const dateRe = /^\d{4}-\d{2}-\d{2}$/;
const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;

const createSchema = z.object({
  date: z.string().regex(dateRe, "date must be YYYY-MM-DD"),
  isBlocked: z.boolean().default(true),
  startTime: z.string().regex(timeRe).optional().nullable(),
  endTime: z.string().regex(timeRe).optional().nullable(),
  locationLabel: z.string().trim().max(120).optional().nullable(),
});

export async function POST(req: Request) {
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

  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const exception = await prisma.availabilityException.create({
    data: {
      coachId: coach.id,
      date: parsed.data.date,
      isBlocked: parsed.data.isBlocked,
      startTime: parsed.data.startTime ?? null,
      endTime: parsed.data.endTime ?? null,
      locationLabel: parsed.data.locationLabel ?? null,
    },
  });

  return NextResponse.json({ exception }, { status: 201 });
}

export async function DELETE(req: Request) {
  const coach = await requireCoach();
  if (!coach) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id query param required" }, { status: 400 });
  }

  const existing = await prisma.availabilityException.findFirst({
    where: { id, coachId: coach.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Exception not found" }, { status: 404 });
  }

  await prisma.availabilityException.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
