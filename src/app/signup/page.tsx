"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: fd.get("email"),
          password: fd.get("password"),
          name: fd.get("name"),
          publicSlug: fd.get("publicSlug"),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Signup failed");
        return;
      }
      router.push("/app");
      router.refresh();
    } catch {
      setError("Network error");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--tee-ink)] px-4 text-[#e8f0ea]">
      <div className="w-full max-w-md">
        <Link href="/" className="text-sm text-[var(--tee-moss)]">
          TeeHold
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Create coach account</h1>
        <p className="mt-2 text-sm text-white/60">
          Start taking deposit-backed lesson bookings.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block text-sm">
            <span className="text-white/70">Name</span>
            <input
              name="name"
              required
              autoComplete="name"
              className="mt-1 w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 outline-none focus:border-[var(--tee-fairway)]"
            />
          </label>
          <label className="block text-sm">
            <span className="text-white/70">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 outline-none focus:border-[var(--tee-fairway)]"
            />
          </label>
          <label className="block text-sm">
            <span className="text-white/70">Password</span>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 outline-none focus:border-[var(--tee-fairway)]"
            />
          </label>
          <label className="block text-sm">
            <span className="text-white/70">Public booking slug</span>
            <div className="mt-1 flex items-center gap-2">
              <span className="shrink-0 text-xs text-white/40">/c/</span>
              <input
                name="publicSlug"
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                placeholder="your-name"
                className="w-full rounded-md border border-white/15 bg-black/20 px-3 py-2 outline-none focus:border-[var(--tee-fairway)]"
              />
            </div>
            <span className="mt-1 block text-xs text-white/40">
              Lowercase letters, numbers, hyphens only
            </span>
          </label>
          {error && <p className="text-sm text-[#e7a07a]">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-[var(--tee-fairway)] px-4 py-2.5 font-medium text-white hover:bg-[#258554] disabled:opacity-60"
          >
            {pending ? "Creating..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-white/50">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--tee-moss)]">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
