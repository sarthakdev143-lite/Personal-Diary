# Diary

A private diary. The browser encrypts entries before they are saved.

## Run

1. Start MongoDB.
2. Copy `env.example` to `.env.local` and set `MONGODB_URI` and `NEXTAUTH_SECRET`.
3. Run `npm install`, then `npm run dev`.

Email signup works without OAuth. Google and GitHub appear when their client ids are set. Stripe Checkout starts when `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are set. Point the webhook at `/api/billing/webhook`.

A forgotten password cannot be reset. The server never receives the password, so it cannot recover entries.

## Test

`npm test`
