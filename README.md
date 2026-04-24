# Offroad Champion Leaderboard Frontend

This app is a Next.js frontend that talks to the off-road-backend API for authentication, wallet, redemptions, and Stripe add-cash flows.

## Local Development

1. Copy `.env.example` to `.env.local`.
2. Set environment values for your local backend.
3. Install dependencies and run:

```bash
npm install
npm run dev
```

## Required Environment Variables

See `.env.example` for exact variable names.

- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_API_KEY`
- `NEXT_PUBLIC_USE_MOCK_API` (must be `false` for production)

## Production Go-Live Checklist

1. Set `NEXT_PUBLIC_USE_MOCK_API=false`.
2. Set `NEXT_PUBLIC_API_URL` to your production backend domain.
3. Set `NEXT_PUBLIC_API_KEY` to match backend `API_KEY`.
4. Set `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` from your Stripe production dashboard.
5. Validate wallet add-cash end-to-end against production backend before switching DNS.
6. Confirm the frontend domain is allowed by backend CORS settings.

## Notes

- Do not commit `.env.local`.
- The frontend calls backend payment-intent finalization after Stripe confirmation, so wallet updates do not depend solely on webhook delivery timing.
