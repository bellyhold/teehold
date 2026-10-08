import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 20% 10%, #1f6b45 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 90% 80%, #c45c26 0%, transparent 50%)",
        }}
      />
      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
        <p className="text-sm uppercase tracking-[0.2em] text-[#b8e0c2]">TeeHold</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
          Stop no-shows from stealing lesson revenue
        </h1>
        <p className="mt-4 max-w-xl text-lg text-white/70">
          Clients book online and pay a deposit before they hit your calendar.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="rounded-md bg-[#1f6b45] px-5 py-3 text-sm font-medium text-white hover:bg-[#258552]"
          >
            Start free
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-white/20 px-5 py-3 text-sm font-medium text-white/80 hover:border-white/40"
          >
            Log in
          </Link>
        </div>
        <ul className="mt-10 space-y-2 text-white/65">
          <li>· Deposit collected at booking</li>
          <li>· Automatic confirmation + reminder emails</li>
          <li>· Your link for Instagram, text, or the range desk</li>
        </ul>
      </div>
    </main>
  );
}
