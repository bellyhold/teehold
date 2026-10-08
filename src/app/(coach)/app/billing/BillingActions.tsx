"use client";

import { useState } from "react";

async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json()) as {
    url?: string;
    error?: string;
    hint?: string;
  };
  if (!res.ok) {
    throw new Error(
      data.hint ? `${data.error}: ${data.hint}` : (data.error ?? "Request failed")
    );
  }
  return data;
}

export function BillingActions({
  stripeConfigured,
  hasCustomer,
  hasConnect,
}: {
  stripeConfigured: boolean;
  hasCustomer: boolean;
  hasConnect: boolean;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run(action: string, fn: () => Promise<{ url?: string }>) {
    setBusy(action);
    setMessage(null);
    try {
      const data = await fn();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setMessage("No redirect URL returned");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={!!busy || !stripeConfigured}
          onClick={() =>
            run("subscribe", () =>
              postJson("/api/billing/checkout", { interval: "monthly" })
            )
          }
          className="rounded bg-[#1f6b45] px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy === "subscribe" ? "Starting…" : "Subscribe"}
        </button>
        <button
          type="button"
          disabled={!!busy || !stripeConfigured || !hasCustomer}
          onClick={() => run("portal", () => postJson("/api/billing/portal"))}
          className="rounded border border-white/20 px-4 py-2 text-sm font-medium text-white/90 disabled:opacity-40"
        >
          {busy === "portal" ? "Opening…" : "Manage"}
        </button>
        <button
          type="button"
          disabled={!!busy || !stripeConfigured}
          onClick={() =>
            run("connect", () => postJson("/api/billing/connect/onboard"))
          }
          className="rounded border border-white/20 px-4 py-2 text-sm font-medium text-white/90 disabled:opacity-40"
        >
          {busy === "connect"
            ? "Connecting…"
            : hasConnect
              ? "Update Connect"
              : "Connect Stripe"}
        </button>
      </div>
      {message ? (
        <p className="text-sm text-[#e7d7b8]" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
