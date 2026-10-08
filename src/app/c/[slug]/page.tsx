import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { computeDepositCents } from "@/lib/money";
import { BookingClient } from "./BookingClient";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ paid?: string; canceled?: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const coach = await prisma.coach.findUnique({
    where: { publicSlug: slug },
    select: { name: true, businessName: true },
  });
  const title = coach
    ? `${coach.businessName?.trim() || coach.name} — Book a lesson`
    : "Book a lesson";
  return { title: `${title} · TeeHold` };
}

export default async function PublicBookingPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;

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
      cancellationHours: true,
    },
  });

  if (!coach) notFound();

  const depositCents = computeDepositCents({
    lessonPriceCents: coach.lessonPriceCents,
    depositType: coach.depositType,
    depositFixedCents: coach.depositFixedCents,
    depositPercent: coach.depositPercent,
  });

  return (
    <BookingClient
      coach={{
        slug: coach.publicSlug,
        name: coach.name,
        businessName: coach.businessName,
        bio: coach.bio,
        photoUrl: coach.photoUrl,
        timezone: coach.timezone,
        lessonDurationMin: coach.lessonDurationMin,
        lessonPriceCents: coach.lessonPriceCents,
        depositCents,
        cancellationHours: coach.cancellationHours,
        cancellationPolicy: `Cancel at least ${coach.cancellationHours} hours before your lesson to request a deposit refund. Late cancellations and no-shows forfeit the deposit.`,
      }}
      paidFlag={sp.paid === "1"}
    />
  );
}
