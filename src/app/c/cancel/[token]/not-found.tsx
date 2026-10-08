export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 py-16 text-center">
      <p className="text-xs uppercase tracking-[0.25em] text-[var(--tee-moss)]">
        TeeHold
      </p>
      <h1 className="mt-3 text-2xl font-semibold text-white">
        Cancel link not found
      </h1>
      <p className="mt-2 text-white/60">
        This cancel link is invalid or the booking was removed.
      </p>
    </main>
  );
}
