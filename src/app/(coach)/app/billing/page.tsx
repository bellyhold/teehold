import { redirect } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { stripeConfigured } from "@/lib/stripe";
import { BillingActions } from "./BillingActions";

export default async function BillingPage() {
  const coach = await requireCoach();
  if (!coach) redirect("/login");

  const configured = stripeConfigured();
  const planLabel =
    coach.plan === "active"
      ? "Active"
      : coach.plan === "canceled"
        ? "Canceled"
        : "Trial";

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
      <p className="mt-2 max-w-xl text-white/60">
        TeeHold SaaS is $39/mo. Connect Stripe to receive lesson deposits
        directly.
      </p>

      <div className="mt-8 space-y-6">
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wide text-[#b8e0c2]">
            Plan status
          </h2>
          <p className="mt-2 text-lg">
            {planLabel}
            {coach.stripeConnectAccountId ? (
              <span className="ml-3 text-sm text-white/50">Connect linked</span>
            ) : null}
          </p>
        </section>

        {!configured ? (
          <section className="rounded-lg border border-[#c45c26]/40 bg-[#c45c26]/10 px-4 py-4">
            <h2 className="font-medium text-[#e7d7b8]">Stripe setup required</h2>
            <p className="mt-2 text-sm text-white/70">
              Current keys look like placeholders. Set these in{" "}
              <code className="text-[#b8e0c2]">.env</code>:
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1 font-mono text-sm text-white/80">
              <li>STRIPE_SECRET_KEY</li>
              <li>STRIPE_WEBHOOK_SECRET</li>
              <li>STRIPE_PRICE_MONTHLY</li>
              <li>STRIPE_PRICE_YEARLY</li>
              <li>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</li>
            </ul>
            <p className="mt-3 text-sm text-white/60">
              Values must not contain <code>replace</code>. Then restart the
              server.
            </p>
          </section>
        ) : null}

        <BillingActions
          stripeConfigured={configured}
          hasCustomer={Boolean(coach.stripeCustomerId)}
          hasConnect={Boolean(coach.stripeConnectAccountId)}
        />
      </div>
    </div>
  );
}
