import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/auth";
import {
  BillingNotConfiguredError,
  createConnectOnboardingLink,
  stripeConfigured,
} from "@/lib/billing";

export async function POST() {
  const coach = await requireCoach();
  if (!coach) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!stripeConfigured()) {
    return NextResponse.json(
      {
        error: "Stripe Connect is not configured",
        hint: "Set STRIPE_SECRET_KEY to a real sk_test_… or sk_live_… key (must not contain 'replace'), then retry Connect onboarding.",
        stub: true,
      },
      { status: 503 }
    );
  }

  try {
    const { url } = await createConnectOnboardingLink(coach.id);
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof BillingNotConfiguredError) {
      return NextResponse.json(
        { error: err.message, stub: true },
        { status: 503 }
      );
    }
    const message =
      err instanceof Error ? err.message : "Connect onboarding failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
