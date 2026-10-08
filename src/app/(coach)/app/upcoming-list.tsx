"use client";

import { formatUsd } from "@/lib/money";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Row = {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  startsAt: string;
  endsAt: string;
  status: string;
  depositCents: number;
  depositStatus: string;
  lessonName: string;
  clientNote: string;
};

export function UpcomingList({
  initial,
  timezone,
}: {
  initial: Row[];
  timezone: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [notes, setNotes] = useState<Record<string, string>>(
    Object.fromEntries(initial.map((r) => [r.id, r.clientNote])),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function formatWhen(iso: string) {
    try {
      return new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return new Date(iso).toLocaleString();
    }
  }

  async function setStatus(id: string, status: "completed" | "no_show" | "canceled") {
    setBusy(id + status);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Update failed");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== id));
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(null);
    }
  }

  async function saveNote(row: Row) {
    setBusy(row.id + "note");
    setError(null);
    try {
      const res = await fetch("/api/bookings/notes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientEmail: row.clientEmail,
          note: notes[row.id] ?? "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Note save failed");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return (
      <p className="mt-8 rounded-md border border-dashed border-white/15 px-4 py-10 text-center text-white/50">
        No upcoming lessons yet. Share your public booking link from Settings.
      </p>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {error && <p className="text-sm text-[#e7a07a]">{error}</p>}
      {rows.map((row) => (
        <article
          key={row.id}
          className="border-b border-white/10 pb-5 last:border-0"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-medium">{formatWhen(row.startsAt)}</p>
              <p className="mt-1 text-sm text-white/70">
                {row.clientName} · {row.lessonName}
              </p>
              <p className="mt-1 text-sm text-white/50">
                <a href={`mailto:${row.clientEmail}`} className="underline-offset-2 hover:underline">
                  {row.clientEmail}
                </a>
                {row.clientPhone ? ` · ${row.clientPhone}` : ""}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wide text-white/40">
                {row.status.replace("_", " ")} · deposit {formatUsd(row.depositCents)} (
                {row.depositStatus})
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!!busy}
                onClick={() => setStatus(row.id, "completed")}
                className="rounded-md border border-white/15 px-3 py-1.5 text-sm hover:border-[#1f6b45] disabled:opacity-50"
              >
                Completed
              </button>
              <button
                type="button"
                disabled={!!busy}
                onClick={() => setStatus(row.id, "no_show")}
                className="rounded-md border border-white/15 px-3 py-1.5 text-sm hover:border-[#c45c26] disabled:opacity-50"
              >
                No-show
              </button>
              <button
                type="button"
                disabled={!!busy}
                onClick={() => setStatus(row.id, "canceled")}
                className="rounded-md border border-white/15 px-3 py-1.5 text-sm text-white/60 hover:border-white/40 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs text-white/50">Client note</label>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row">
              <textarea
                value={notes[row.id] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [row.id]: e.target.value }))}
                rows={2}
                className="w-full flex-1 rounded-md border border-white/15 bg-black/20 px-3 py-2 text-sm outline-none focus:border-[#1f6b45]"
                placeholder="Notes for this client (by email)…"
              />
              <button
                type="button"
                disabled={!!busy}
                onClick={() => saveNote(row)}
                className="shrink-0 rounded-md bg-[#1f6b45] px-3 py-2 text-sm font-medium hover:bg-[#258554] disabled:opacity-50"
              >
                Save note
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
