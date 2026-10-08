import Link from "next/link";
import { redirect } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { LogoutButton } from "./logout-button";

export default async function CoachAppLayout({ children }: { children: React.ReactNode }) {
  const coach = await requireCoach();
  if (!coach) redirect("/login");

  return (
    <div className="min-h-screen bg-[#0f1f17] text-[#e8f0ea]">
      <header className="border-b border-white/10 px-4 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/app" className="font-semibold tracking-tight text-[#b8e0c2]">
              TeeHold
            </Link>
            <span className="hidden text-sm text-white/40 sm:inline">
              {coach.businessName || coach.name}
            </span>
          </div>
          <nav className="flex flex-wrap items-center gap-3 text-sm text-white/70">
            <Link href="/app">Upcoming</Link>
            <Link href="/app/availability">Availability</Link>
            <Link href="/app/settings">Settings</Link>
            <Link href="/app/billing">Billing</Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
