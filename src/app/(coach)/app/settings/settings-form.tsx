"use client";

import { formatUsd } from "@/lib/money";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Settings = {
  businessName: string;
  timezone: string;
  lessonDurationMin: number;
  lessonPriceCents: number;
  depositType: "fixed" | "percent";
  depositFixedCents: number;
  depositPercent: number;
  bufferMin: number;
  cancellationHours: number;
  publicLink: string;
};

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC",
];

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const priceDollars = (form.lessonPriceCents / 100).toFixed(2);
  const depositDollars = (form.depositFixedCents / 100).toFixed(2);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: form.businessName || null,
          timezone: form.timezone,
          lessonDurationMin: form.lessonDurationMin,
          lessonPriceCents: form.lessonPriceCents,
          depositType: form.depositType,
          depositFixedCents: form.depositFixedCents,
          depositPercent: form.depositPercent,
          bufferMin: form.bufferMin,
          cancellationHours: form.cancellationHours,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Save failed");
        return;
      }
      if (data.settings?.publicLink) {
        setForm((f) => ({ ...f, publicLink: data.settings.publicLink }));
      }
      setMessage("Settings saved");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setPending(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(form.publicLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link");
    }
  }

  const inputClass =
    "mt-1 w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 outline-none focus:border-[#1f6b45]";

  return (
    <form onSubmit={onSubmit} className="mt-8 max-w-lg space-y-5">
      <div className="rounded-md border border-[#1f6b45]/40 bg-[#1f6b45]/10 px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-white/50">Public booking link</p>
        <p className="mt-1 break-all text-sm text-[#b8e0c2]">{form.publicLink}</p>
        <button
          type="button"
          onClick={copyLink}
          className="mt-2 text-sm text-white/70 underline-offset-2 hover:underline"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>

      <label className="block text-sm">
        <span className="text-white/70">Business name</span>
        <input
          value={form.businessName}
          onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
          className={inputClass}
        />
      </label>

      <label className="block text-sm">
        <span className="text-white/70">Timezone</span>
        <select
          value={form.timezone}
          onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
          className={inputClass}
        >
          {!TIMEZONES.includes(form.timezone) && (
            <option value={form.timezone}>{form.timezone}</option>
          )}
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-white/70">Lesson duration (min)</span>
          <input
            type="number"
            min={15}
            max={480}
            step={15}
            value={form.lessonDurationMin}
            onChange={(e) =>
              setForm((f) => ({ ...f, lessonDurationMin: Number(e.target.value) }))
            }
            className={inputClass}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-white/70">Lesson price (USD)</span>
          <input
            type="number"
            min={0}
            step={0.01}
            value={priceDollars}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                lessonPriceCents: Math.round(Number(e.target.value) * 100),
              }))
            }
            className={inputClass}
            required
          />
          <span className="mt-1 block text-xs text-white/40">
            {formatUsd(form.lessonPriceCents)}
          </span>
        </label>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm text-white/70">Deposit rule</legend>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="depositType"
              checked={form.depositType === "fixed"}
              onChange={() => setForm((f) => ({ ...f, depositType: "fixed" }))}
            />
            Fixed amount
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="depositType"
              checked={form.depositType === "percent"}
              onChange={() => setForm((f) => ({ ...f, depositType: "percent" }))}
            />
            Percent
          </label>
        </div>
        {form.depositType === "fixed" ? (
          <label className="block text-sm">
            <span className="text-white/70">Deposit (USD)</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={depositDollars}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  depositFixedCents: Math.round(Number(e.target.value) * 100),
                }))
              }
              className={inputClass}
            />
          </label>
        ) : (
          <label className="block text-sm">
            <span className="text-white/70">Deposit percent</span>
            <input
              type="number"
              min={1}
              max={100}
              value={form.depositPercent}
              onChange={(e) =>
                setForm((f) => ({ ...f, depositPercent: Number(e.target.value) }))
              }
              className={inputClass}
            />
          </label>
        )}
      </fieldset>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-white/70">Buffer between lessons (min)</span>
          <input
            type="number"
            min={0}
            max={180}
            value={form.bufferMin}
            onChange={(e) => setForm((f) => ({ ...f, bufferMin: Number(e.target.value) }))}
            className={inputClass}
          />
        </label>
        <label className="block text-sm">
          <span className="text-white/70">Cancellation window (hours)</span>
          <input
            type="number"
            min={0}
            max={168}
            value={form.cancellationHours}
            onChange={(e) =>
              setForm((f) => ({ ...f, cancellationHours: Number(e.target.value) }))
            }
            className={inputClass}
          />
        </label>
      </div>

      {error && <p className="text-sm text-[#e7a07a]">{error}</p>}
      {message && <p className="text-sm text-[#b8e0c2]">{message}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-[#1f6b45] px-4 py-2.5 font-medium hover:bg-[#258554] disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
