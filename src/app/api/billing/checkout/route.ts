import { NextResponse } from "next/server";
import { requireCoach } from "@/lib/auth";
import {
  BillingNotConfiguredError,
  createCoachSubscriptionCheckout,
  stripeConfigured,
} from "@/lib/billing";

export async function POST(req: Request) {
  const coach = await requireCoach();
  if (!coach) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!stripeConfigured()) {
    return NextResponse.json(
      {
        error: "Stripe is not configured",
        hint: "Set STRIPE_SECRET_KEY and STRIPE_PRICE_MONTHLY (values must not contain 'replace').",
      },
      { status: 503 }
    );
  }

  let interval: "monthly" | "yearly" = "monthly";
  try {
    const body = (await req.json().catch(() => ({}))) as {
      interval?: string;
    };
    if (body.interval === "yearly") interval = "yearly";
  } catch {
    // empty body is fine
  }

  try {
    const { url } = await createCoachSubscriptionCheckout(coach.id, interval);
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof BillingNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
