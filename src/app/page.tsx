import Link from "next/link";
import { Fraunces, Source_Sans_3 } from "next/font/google";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
});

export default function LandingPage() {
  return (
    <main className={`${display.variable} ${sans.variable} relative min-h-screen overflow-hidden`}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 90% 70% at 15% 0%, rgba(31, 107, 69, 0.55) 0%, transparent 58%),
            radial-gradient(ellipse 70% 55% at 100% 100%, rgba(196, 92, 38, 0.28) 0%, transparent 52%),
            linear-gradient(165deg, #0a1610 0%, #13261c 42%, #0f1f17 100%)
          `,
        }}
      />
      <div
        aria-hidden
        className="tee-drift pointer-events-none absolute -left-24 top-1/4 h-[420px] w-[420px] rounded-full opacity-30 blur-3xl"
        style={{ background: "radial-gradient(circle, #2d8a58 0%, transparent 70%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(-18deg, transparent, transparent 46px, rgba(184,224,194,0.35) 46px, rgba(184,224,194,0.35) 47px)",
        }}
      />

      <div
        className="relative mx-auto flex min-h-screen max-w-4xl flex-col px-6 pb-16 pt-10 md:px-10"
        style={{ fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif" }}
      >
        <section className="flex flex-1 flex-col justify-center py-16 md:py-24">
          <h1
            className="tee-fade-up text-6xl font-normal tracking-tight text-[#e8f0ea] md:text-8xl"
            style={{ fontFamily: "var(--font-display), Georgia, serif" }}
          >
            TeeHold
          </h1>
          <p className="tee-fade-up tee-delay-1 mt-6 max-w-lg text-2xl font-medium leading-snug tracking-tight text-[#e8f0ea] md:text-3xl">
            Hold the tee time. Collect the deposit.
          </p>
          <p className="tee-fade-up tee-delay-2 mt-4 max-w-md text-lg leading-relaxed text-white/65">
            Clients book online and pay before they hit your calendar—so no-shows stop eating lesson revenue.
          </p>
          <div className="tee-fade-up tee-delay-3 mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/signup"
              className="tee-cta rounded-md bg-[#1f6b45] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#258552]"
            >
              Start free
            </Link>
            <Link
              href="/login"
              className="rounded-md border border-white/20 px-6 py-3.5 text-sm font-medium text-white/80 transition-colors hover:border-white/40 hover:text-white"
            >
              Log in
            </Link>
          </div>
        </section>

        <section className="tee-fade-up tee-delay-4 border-t border-white/10 pt-10">
          <p className="max-w-md text-base leading-relaxed text-white/55">
            Confirmation and reminder emails included.{" "}
            <span className="text-white/80">$39/mo</span> once you&apos;re ready to charge deposits.
          </p>
        </section>
      </div>
    </main>
  );
}
