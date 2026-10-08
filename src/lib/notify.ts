/**
 * Thin notification helpers for booking flows (Agents A/B).
 * Prefer importing from here when you only need confirmation side-effects.
 */
import {
  sendBookingConfirmation,
  sendBookingReminder,
  sendCoachNewBooking,
  type EmailResult,
} from "@/lib/email";

export type { EmailResult };

export async function notifyBookingConfirmed(input: {
  to: string;
  coachName: string;
  startsAt: Date | string;
  depositUsd: number | string;
  cancelUrl: string;
}): Promise<EmailResult> {
  return sendBookingConfirmation(input);
}

export async function notifyBookingReminder(input: {
  to: string;
  coachName: string;
  startsAt: Date | string;
}): Promise<EmailResult> {
  return sendBookingReminder(input);
}

export async function notifyCoachNewBooking(input: {
  to: string;
  clientName: string;
  startsAt: Date | string;
}): Promise<EmailResult> {
  return sendCoachNewBooking(input);
}
