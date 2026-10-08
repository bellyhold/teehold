import { requireCoach } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const coach = await requireCoach();
  if (!coach) redirect("/login");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const publicLink = `${appUrl}/c/${coach.publicSlug}`;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-2 text-sm text-white/60">
        Lesson pricing, deposits, and your public booking link.
      </p>
      <SettingsForm
        initial={{
          businessName: coach.businessName ?? "",
          timezone: coach.timezone,
          lessonDurationMin: coach.lessonDurationMin,
          lessonPriceCents: coach.lessonPriceCents,
          depositType: coach.depositType,
          depositFixedCents: coach.depositFixedCents,
          depositPercent: coach.depositPercent,
          bufferMin: coach.bufferMin,
          cancellationHours: coach.cancellationHours,
          publicLink,
        }}
      />
    </div>
  );
}
