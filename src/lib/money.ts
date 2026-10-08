export type DepositType = "fixed" | "percent";

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function computeDepositCents(input: {
  lessonPriceCents: number;
  depositType: DepositType;
  depositFixedCents: number;
  depositPercent: number;
}): number {
  if (input.depositType === "percent") {
    return Math.max(100, Math.round((input.lessonPriceCents * input.depositPercent) / 100));
  }
  return Math.min(input.depositFixedCents, input.lessonPriceCents);
}
