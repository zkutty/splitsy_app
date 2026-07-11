# SplitTrip

SplitTrip is a shared trip-expense tracker: groups can log costs in any
currency, split them equally, by fixed amount, or by percentage, and see the
fewest payments needed to settle up — including mid-trip departures.

- Expo Router app for iOS, Android, and web
- Google sign-in via Supabase Auth
- Multi-currency expense entry with stored trip-currency conversion
- Equal, by-amount, and by-percentage expense splitting
- Trip groups (settle up per household/couple instead of per person)
- Early departure settlement for members who leave a trip before it ends
- Append-only activity log of trip events (expenses, membership, settlements)
- Multi-use invite links alongside single-use email invites
- Settle-up payment links (Venmo, PayPal, Cash App) from member profiles
- Shared domain package for categories, validation, and settlement logic
- Supabase SQL schema for trips, groups, members, expenses, invites, and activity

A Cloudflare Worker (`worker.js`) serves the exported web build and injects
per-route `<title>`/meta/Open Graph tags so crawlers and link previews see
the correct content for each public page.

## Workspace

- `apps/expo`: Expo Router client
- `packages/domain`: shared types, validation, and settlement engine
- `supabase/migrations`: database schema
- `worker.js`: Cloudflare Worker that serves the web build with per-route meta injection

### Note on package naming

Workspace packages are still published under the `@splitsy/*` scope (e.g.
`@splitsy/domain`) even though the product is branded SplitTrip. Renaming
the scope to `@splittrip/*` has been discussed but is intentionally out of
scope for this change — it touches every workspace `package.json` and
import path, so it's tracked as a separate follow-up rather than bundled
here.

## Local setup

1. Install dependencies with `bun install`
2. Copy `.env.example` to `apps/expo/.env`
3. Fill in Supabase and Google OAuth values
4. Run `bun run dev:web`, `bun run dev:ios`, or `bun run dev:android`
5. Apply the SQL files under [`supabase/migrations`](supabase/migrations) to your Supabase project, in order
6. Replace the placeholder EAS project id in [`apps/expo/app.json`](apps/expo/app.json) after `eas init`

## Other scripts

- `bun run test` — run the domain package's test suite
- `bun run typecheck` — typecheck `packages/domain` and `apps/expo`

## Deploy

- Web export: `bun --cwd apps/expo run export:web`
- Mobile builds: `eas build --profile preview --platform ios` or `eas build --profile preview --platform android`
- Config lives in [`eas.json`](eas.json)

## Current boundaries

- Shared persisted data is wired for Supabase, but local mock data is used when env vars are missing.
- Exchange-rate fetching is abstracted behind a service and currently seeded with sample rates.
