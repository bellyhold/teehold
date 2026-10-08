import { Resend } from "resend";

export type EmailResult = { ok: true; stub?: true; id?: string } | { ok: false; error: string };

function shouldStub(): boolean {
  const key = process.env.RESEND_API_KEY;
  return !key || key.toLowerCase().includes("replace");
}

function fromAddress(): string {
  return process.env.EMAIL_FROM ?? "TeeHold <bookings@localhost>";
}

function formatWhen(startsAt: Date | string): string {
  const d = typeof startsAt === "string" ? new Date(startsAt) : startsAt;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(d);
}

/** Minimal .ics event string for calendar attachments / mailto workflows. */
export function buildIcsEvent(input: {
  title: string;
  startsAt: Date | string;
  durationMin?: number;
  description?: string;
}): string {
  const start = typeof input.startsAt === "string" ? new Date(input.startsAt) : input.startsAt;
  const durationMin = input.durationMin ?? 60;
  const end = new Date(start.getTime() + durationMin * 60_000);

  const stamp = (d: Date) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z");

  const escape = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TeeHold//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(input.title)}`,
    input.description ? `DESCRIPTION:${escape(input.description)}` : null,
    `UID:teehold-${stamp(start)}@teehold`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

async function deliver(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: string }[];
}): Promise<EmailResult> {
  if (shouldStub()) {
    console.log("[email stub]", {
      to: input.to,
      from: fromAddress(),
      subject: input.subject,
      text: input.text,
      attachments: input.attachments?.map((a) => a.filename),
    });
    return { ok: true, stub: true };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: fromAddress(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      attachments: input.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
      })),
    });

    if (error) {
      console.error("[email] Resend error", error);
      return { ok: false, error: error.message };
    }
    return { ok: true, id: data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    console.error("[email] send failed", err);
    return { ok: false, error: message };
  }
}

export async function sendBookingConfirmation(input: {
  to: string;
  coachName: string;
  startsAt: Date | string;
  depositUsd: number | string;
  cancelUrl: string;
}): Promise<EmailResult> {
  const when = formatWhen(input.startsAt);
  const deposit =
    typeof input.depositUsd === "number"
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
          input.depositUsd,
        )
      : input.depositUsd;

  const subject = `Confirmed: lesson with ${input.coachName}`;
  const text = [
    `Your lesson with ${input.coachName} is confirmed.`,
    `When: ${when}`,
    `Deposit paid: ${deposit}`,
    `Need to cancel? ${input.cancelUrl}`,
  ].join("\n");

  const html = `
    <div style="font-family:Georgia,serif;line-height:1.5;color:#0f1f17">
      <p style="font-size:18px;margin:0 0 12px">Your lesson with <strong>${escapeHtml(input.coachName)}</strong> is confirmed.</p>
      <p style="margin:0 0 8px"><strong>When:</strong> ${escapeHtml(when)}</p>
      <p style="margin:0 0 8px"><strong>Deposit paid:</strong> ${escapeHtml(deposit)}</p>
      <p style="margin:16px 0 0"><a href="${escapeAttr(input.cancelUrl)}">Cancel this booking</a></p>
      <p style="margin:24px 0 0;color:#5a6b60;font-size:13px">TeeHold</p>
    </div>
  `.trim();

  const ics = buildIcsEvent({
    title: `Golf lesson with ${input.coachName}`,
    startsAt: input.startsAt,
    description: `Deposit paid: ${deposit}`,
  });

  return deliver({
    to: input.to,
    subject,
    html,
    text,
    attachments: [{ filename: "lesson.ics", content: ics }],
  });
}

export async function sendBookingReminder(input: {
  to: string;
  coachName: string;
  startsAt: Date | string;
}): Promise<EmailResult> {
  const when = formatWhen(input.startsAt);
  const subject = `Reminder: lesson with ${input.coachName} tomorrow`;
  const text = [
    `Reminder: your lesson with ${input.coachName} is coming up.`,
    `When: ${when}`,
  ].join("\n");

  const html = `
    <div style="font-family:Georgia,serif;line-height:1.5;color:#0f1f17">
      <p style="font-size:18px;margin:0 0 12px">Reminder: your lesson with <strong>${escapeHtml(input.coachName)}</strong> is coming up.</p>
      <p style="margin:0 0 8px"><strong>When:</strong> ${escapeHtml(when)}</p>
      <p style="margin:24px 0 0;color:#5a6b60;font-size:13px">TeeHold</p>
    </div>
  `.trim();

  return deliver({ to: input.to, subject, html, text });
}

export async function sendCoachNewBooking(input: {
  to: string;
  clientName: string;
  startsAt: Date | string;
}): Promise<EmailResult> {
  const when = formatWhen(input.startsAt);
  const subject = `New booking: ${input.clientName}`;
  const text = [
    `${input.clientName} booked a lesson.`,
    `When: ${when}`,
  ].join("\n");

  const html = `
    <div style="font-family:Georgia,serif;line-height:1.5;color:#0f1f17">
      <p style="font-size:18px;margin:0 0 12px"><strong>${escapeHtml(input.clientName)}</strong> booked a lesson.</p>
      <p style="margin:0 0 8px"><strong>When:</strong> ${escapeHtml(when)}</p>
      <p style="margin:24px 0 0;color:#5a6b60;font-size:13px">TeeHold</p>
    </div>
  `.trim();

  return deliver({ to: input.to, subject, html, text });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s).replace(/'/g, "&#39;");
}
