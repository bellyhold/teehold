import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCoach } from "@/lib/auth";
import { prisma } from "@/lib/db";

const schema = z.object({
  clientEmail: z.string().email().transform((v) => v.trim().toLowerCase()),
  note: z.string().max(5000),
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

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { clientEmail, note } = parsed.data;

  const clientNote = await prisma.clientNote.upsert({
    where: {
      coachId_clientEmail: { coachId: coach.id, clientEmail },
    },
    create: { coachId: coach.id, clientEmail, note },
    update: { note },
  });

  return NextResponse.json({ clientNote });
}
