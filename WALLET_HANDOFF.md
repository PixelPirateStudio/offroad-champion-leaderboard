# ORC Wallet Page

## Overview

The wallet experience lives at **`/orc-wallet`** and is a single-page authenticated view with three tabs: **Wallet**, **Add Cash**, and **Transactions**. Everything is in two files:

- `src/pages/orc-wallet.tsx` — the entire page (~1,100 lines), all UI logic, state, and tab management
- `src/components/wallet/AddCashStripeFlow.tsx` — the Stripe `<PaymentElement>` sub-flow, extracted as a component because it must live inside a Stripe `<Elements>` provider

All backend calls go through `src/services/playerApi.ts` (`PlayerApiService` singleton exported as `playerApi`).

---

## Authentication

The page uses a local login form (username/password). `playerApi.login()` hits `POST /api/v2/auth/login` and stores a JWT + `profileId` in `localStorage` (`playerToken`, `playerProfileId`). All subsequent API calls attach `Authorization: Bearer <token>`. Logout clears localStorage and resets all state.

---

## Currency Model

The wallet tracks **Gimmie Tokens (GM)**. The conversion rate is `$0.01 per GM` (constant `USD_PER_GM`). The player's `profile.gains` field is their GM balance. Dollar amounts shown are derived: `maxTransferUsd = gains * 0.01`.

---

## Tab: Wallet (Withdraw)

The withdrawal flow is a multi-stage state machine via `transferStage`:

| Stage | Description |
|---|---|
| `none` | Shows GM balance, dollar equivalent, and an amount input. Clicking **Withdraw** advances if amount is valid. |
| `method` | **Stripe Connect gate first**: if `connectStatus.complete === false`, the user is sent to Stripe Connect onboarding (`playerApi.getConnectOnboardingUrl()`). After redirect back (`?connect=return`), status is refreshed. If complete, user picks **Bank Account** or **PayPal**. |
| `details` | Collects bank details (holder, bank name, account #, routing #, email) or PayPal (name, email). |
| `verify` | Collects identity info (legal name, address, DOB) and a checkbox attestation. |
| `confirm` | Summary screen. Submits via `playerApi.createRedemption({ amount, email })` → `POST /api/v2/redemptions`. On success: optimistically deducts balance, adds a transaction entry, advances to `success`, then asynchronously syncs profile from server. |
| `success` | Confirmation screen with a "View your account" button back to `none`. |

**Important note:** The bank/PayPal form details (account number, routing number, etc.) are collected in UI state but are **not sent to the backend** — only `amount` and `email` are passed to `createRedemption`. Those fields appear to be for future use or manual processing.

---

## Tab: Add Cash (Stripe)

Uses `addCashStage`:

| Stage | Description |
|---|---|
| `entry` | Dollar amount input. Minimum $0.50. **Continue** calls `playerApi.createStripePaymentIntent({ amountUsd })` → `POST /api/v2/stripe/payment-intents`, which returns `{ clientSecret, paymentIntentId }`. |
| `payment` | Renders `<AddCashStripeFlow>` wrapped in Stripe `<Elements clientSecret=...>`. The sub-component shows a two-step flow: collect card info → confirm screen → calls `stripe.confirmPayment()` → on success calls `playerApi.finalizeStripePaymentIntent()` → `POST /api/v2/stripe/payment-intents/:id/finalize` → calls `onSuccess()`. |
| `success` | Confirmation. Wallet balance refresh is triggered (Stripe webhooks handle the actual server-side credit). |

The Stripe publishable key is read from `process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

---

## Tab: Transactions

Loads redemptions from `playerApi.getMyRedemptions()` → `GET /api/v2/redemptions/my`. All redemptions are shown as negative (withdrawal) entries. Optimistic entries for in-progress Stripe deposits (`stripe-*`) and transfers (`transfer-*`) are merged in and preserved across refreshes.

---

## Key API Methods (playerApi.ts)

| Method | Endpoint | Purpose |
|---|---|---|
| `login()` | `POST /api/v2/auth/login` | Issues JWT |
| `getMyProfile()` | `GET /api/v2/profiles/:id` | Loads GM balance |
| `getMyRedemptions()` | `GET /api/v2/redemptions/my` | Transaction history |
| `createRedemption()` | `POST /api/v2/redemptions` | Submit withdrawal |
| `createStripePaymentIntent()` | `POST /api/v2/stripe/payment-intents` | Start deposit |
| `finalizeStripePaymentIntent()` | `POST /api/v2/stripe/payment-intents/:id/finalize` | Confirm deposit |
| `getConnectStatus()` | `GET /api/v2/redemptions/connect/status` | Check Stripe Connect |
| `getConnectOnboardingUrl()` | `POST /api/v2/redemptions/connect/onboarding` | Get onboarding link |

---

## Mock API

Set `NEXT_PUBLIC_USE_MOCK_API=true` in `.env.local` to run fully offline. The mock data is defined at the top of `playerApi.ts` — mock profile has 80,000 GM, and `getConnectStatus` returns `complete: false` (so the Connect onboarding gate will always appear on withdrawals).

---

## Environment Variables

```
NEXT_PUBLIC_API_URL=                  # Backend base URL (default: http://localhost:3000)
NEXT_PUBLIC_API_KEY=                  # Static API key sent in every request header as "api"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=   # Stripe publishable key
NEXT_PUBLIC_USE_MOCK_API=             # Set to "true" for offline development
```

---

## Known / Outstanding Items

- Bank account and PayPal form fields (account number, routing, etc.) are collected but **not transmitted** to the backend — only `amount` and `email` are sent. If real bank routing is needed, `createRedemption` and the backend would need to be extended.
- The identity verification form (`verify` stage) is also collected client-side only and not sent to the API.
- Stripe Connect onboarding is gated on `connectStatus.complete`, but the mock always returns `complete: false` — test real withdrawal flow only against a live or staging backend.
