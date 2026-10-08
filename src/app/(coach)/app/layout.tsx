import Link from "next/link";

export default function CoachAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0f1f17] text-[#e8f0ea]">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link href="/app" className="font-semibold tracking-tight text-[#b8e0c2]">
            TeeHold
          </Link>
          <nav className="flex flex-wrap gap-3 text-sm text-white/70">
            <Link href="/app">Upcoming</Link>
            <Link href="/app/availability">Availability</Link>
            <Link href="/app/settings">Settings</Link>
            <Link href="/app/billing">Billing</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
