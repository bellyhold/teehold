import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { computeDepositCents } from "@/lib/money";

type Params = { params: Promise<{ slug: string }> };

/** GET /api/public/[slug] — public coach profile (no secrets). */
export async function GET(_req: Request, { params }: Params) {
  const { slug } = await params;

  const coach = await prisma.coach.findUnique({
    where: { publicSlug: slug },
    select: {
      name: true,
      businessName: true,
      bio: true,
      photoUrl: true,
      publicSlug: true,
      timezone: true,
      lessonDurationMin: true,
      lessonPriceCents: true,
      depositType: true,
      depositFixedCents: true,
      depositPercent: true,
      bufferMin: true,
      cancellationHours: true,
    },
  });

  if (!coach) {
    return NextResponse.json({ error: "Coach not found" }, { status: 404 });
  }

  const depositCents = computeDepositCents({
    lessonPriceCents: coach.lessonPriceCents,
    depositType: coach.depositType,
    depositFixedCents: coach.depositFixedCents,
    depositPercent: coach.depositPercent,
  });

  const cancellationPolicy = `Cancel at least ${coach.cancellationHours} hours before your lesson to request a deposit refund. Late cancellations and no-shows forfeit the deposit.`;

  return NextResponse.json({
    slug: coach.publicSlug,
    name: coach.name,
    businessName: coach.businessName,
    bio: coach.bio,
    photoUrl: coach.photoUrl,
    timezone: coach.timezone,
    lessonDurationMin: coach.lessonDurationMin,
    lessonPriceCents: coach.lessonPriceCents,
    depositCents,
    depositType: coach.depositType,
    bufferMin: coach.bufferMin,
    cancellationHours: coach.cancellationHours,
    cancellationPolicy,
  });
}
