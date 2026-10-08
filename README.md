# TeeHold

Golf coaches take lesson bookings with a **card deposit** so no-shows stop eating the calendar.

Public booking: `/c/:slug` · Coach app: `/app` · SaaS: **$39/mo**

## Quick start

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

- Landing: `/`
- Coach signup/login: `/signup` · `/login`
- Demo coach: `demo@teehold.local` / `demo-password-123`
- Public booking: `/c/demo-pro`
- Stripe/Resend: leave `*replace*` placeholders for local stub mode

## Docs for builders

See `AGENTS.md` for parallel workstream ownership.
