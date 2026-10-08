"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

type Rule = {
  weekday: number;
  startTime: string;
  endTime: string;
  locationLabel: string | null;
};

type Exception = {
  id: string;
  date: string;
  isBlocked: boolean;
};

export function AvailabilityEditor({
  initialRules,
  initialExceptions,
}: {
  initialRules: Rule[];
  initialExceptions: Exception[];
}) {
  const router = useRouter();
  const [rules, setRules] = useState<Rule[]>(
    initialRules.length
      ? initialRules
      : [{ weekday: 1, startTime: "09:00", endTime: "17:00", locationLabel: null }],
  );
  const [exceptions, setExceptions] = useState(initialExceptions);
  const [blockDate, setBlockDate] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function updateRule(index: number, patch: Partial<Rule>) {
    setRules((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addRule() {
    setRules((prev) => [
      ...prev,
      { weekday: 1, startTime: "09:00", endTime: "17:00", locationLabel: null },
    ]);
  }

  function removeRule(index: number) {
    setRules((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveRules(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/availability/rules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rules: rules.map((r) => ({
            weekday: r.weekday,
            startTime: r.startTime,
            endTime: r.endTime,
            locationLabel: r.locationLabel || null,
          })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Save failed");
        return;
      }
      setMessage("Weekly hours saved");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setPending(false);
    }
  }

  async function addBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!blockDate) return;
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/availability/exceptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: blockDate, isBlocked: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not block date");
        return;
      }
      setExceptions((prev) => [...prev, data.exception].sort((a, b) => a.date.localeCompare(b.date)));
      setBlockDate("");
      setMessage("Date blocked");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setPending(false);
    }
  }

  async function removeException(id: string) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/availability/exceptions?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Delete failed");
        return;
      }
      setExceptions((prev) => prev.filter((e) => e.id !== id));
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setPending(false);
    }
  }

  const inputClass =
    "rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[#1f6b45]";

  return (
    <div className="mt-8 space-y-10">
      {error && <p className="text-sm text-[#e7a07a]">{error}</p>}
      {message && <p className="text-sm text-[#b8e0c2]">{message}</p>}

      <section>
        <h2 className="text-lg font-medium">Weekly hours</h2>
        <form onSubmit={saveRules} className="mt-4 space-y-3">
          {rules.map((rule, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
            >
              <select
                value={rule.weekday}
                onChange={(e) => updateRule(i, { weekday: Number(e.target.value) })}
                className={inputClass}
              >
                {DAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
              <input
                type="time"
                value={rule.startTime}
                onChange={(e) => updateRule(i, { startTime: e.target.value })}
                className={inputClass}
                required
              />
              <span className="text-white/40">to</span>
              <input
                type="time"
                value={rule.endTime}
                onChange={(e) => updateRule(i, { endTime: e.target.value })}
                className={inputClass}
                required
              />
              <button
                type="button"
                onClick={() => removeRule(i)}
                className="text-sm text-white/40 hover:text-[#e7a07a]"
              >
                Remove
              </button>
            </div>
          ))}
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={addRule}
              className="rounded-md border border-white/15 px-3 py-2 text-sm hover:border-[#1f6b45]"
            >
              Add window
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-[#1f6b45] px-4 py-2 text-sm font-medium hover:bg-[#258554] disabled:opacity-50"
            >
              Save weekly hours
            </button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-medium">Block dates</h2>
        <p className="mt-1 text-sm text-white/50">Days when you are fully unavailable.</p>
        <form onSubmit={addBlock} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block text-sm">
            <span className="text-white/70">Date</span>
            <input
              type="date"
              value={blockDate}
              onChange={(e) => setBlockDate(e.target.value)}
              required
              className={`mt-1 block ${inputClass}`}
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-[#1f6b45] px-4 py-2 text-sm font-medium hover:bg-[#258554] disabled:opacity-50"
          >
            Block date
          </button>
        </form>
        <ul className="mt-4 space-y-2">
          {exceptions.length === 0 && (
            <li className="text-sm text-white/40">No blocked dates.</li>
          )}
          {exceptions.map((ex) => (
            <li
              key={ex.id}
              className="flex items-center justify-between gap-3 border-b border-white/10 py-2 text-sm"
            >
              <span>
                {ex.date}
                {ex.isBlocked ? " · blocked" : ""}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => removeException(ex.id)}
                className="text-white/40 hover:text-[#e7a07a]"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
