# TeeHold — parallel agent contracts

Golf coach booking + deposit MVP. **Do not expand scope.**

## Stack

- Next.js App Router (`src/app`), TypeScript, Tailwind
- Prisma 7 + SQLite (`prisma/schema.prisma`, client in `src/generated/prisma`)
- Auth: `src/lib/auth.ts` (cookie JWT)
- Stripe / Resend via env stubs

## Shared files (coordinate; prefer extend, don't rewrite)

- `prisma/schema.prisma`
- `src/lib/db.ts`, `auth.ts`, `stripe.ts`, `money.ts`, `slots.ts`
- `src/app/globals.css`, `src/app/layout.tsx`

## Ownership (avoid edit conflicts)

| Agent | Owns | Must not touch |
|---|---|---|
| A — Coach app | `src/app/(coach)/**`, `src/app/api/auth/**`, `src/app/api/availability/**`, `src/app/api/settings/**`, `src/app/api/bookings/**` (coach PATCH) | public booking UI, stripe webhook |
| B — Public book | `src/app/c/**`, `src/app/api/public/**`, slot UX | coach dashboard, stripe billing |
| C — Stripe | `src/app/api/stripe/**`, `src/app/api/billing/**`, `src/lib/stripe.ts` (extend), Connect + SaaS + deposit checkout helpers in `src/lib/billing.ts` | unrelated UI polish |
| D — Comms + marketing | `src/lib/email.ts`, `src/app/api/cron/**`, `src/app/page.tsx` (landing), `src/app/(marketing)/**` if needed | booking slot math |

## Product rules (MVP)

- One coach per account; public page `/c/:slug`
- Deposit at booking; email confirm + 24h reminder
- $39/mo SaaS; Stripe Connect Express preferred (stub OK if keys missing)
- No SMS, multi-staff, swing video, marketplace

## Commands

```bash
npm run db:generate
npm run db:migrate
npm run dev
```

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
