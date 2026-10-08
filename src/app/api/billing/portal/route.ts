import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/auth";
import {
  BillingNotConfiguredError,
  createBillingPortal,
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
        error: "Stripe is not configured",
        hint: "Set STRIPE_SECRET_KEY (value must not contain 'replace').",
      },
      { status: 503 }
    );
  }

  try {
    const { url } = await createBillingPortal(coach.id);
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof BillingNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : "Portal failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
