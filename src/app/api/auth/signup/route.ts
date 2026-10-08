import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";

const schema = z.object({
  email: z.string().email().transform((v) => v.trim().toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().trim().min(1, "Name is required").max(120),
  publicSlug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and hyphens")
    .min(2)
    .max(48),
});

export async function POST(req: Request) {
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

  const { email, password, name, publicSlug } = parsed.data;

  const existing = await prisma.coach.findFirst({
    where: { OR: [{ email }, { publicSlug }] },
  });
  if (existing) {
    const field = existing.email === email ? "email" : "publicSlug";
    return NextResponse.json(
      { error: field === "email" ? "Email already registered" : "Public slug already taken" },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);

  const coach = await prisma.coach.create({
    data: {
      email,
      passwordHash,
      name,
      publicSlug,
      businessName: name,
      lessonTypes: {
        create: {
          name: "Private lesson",
          durationMin: 60,
          priceCents: 10000,
        },
      },
    },
  });

  await createSession(coach.id);

  return NextResponse.json({ ok: true, coachId: coach.id });
}
