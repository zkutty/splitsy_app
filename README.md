# Splitsy

Greenfield scaffold for a shared trip-expense tracker with:

- Expo Router app for iOS, Android, and web
- Google sign-in via Supabase Auth
- Multi-currency expense entry with stored trip-currency conversion
- Shared domain package for categories, validation, and settlement logic
- Supabase SQL schema for trips, members, expenses, and participants

## Workspace

- `apps/expo`: Expo Router client
- `packages/domain`: shared types, validation, and settlement engine
- `supabase/migrations`: database schema

## Local setup

1. Install dependencies with `bun install`
2. Copy `.env.example` to `apps/expo/.env`
3. Fill in Supabase and Google OAuth values
4. Run `bun run dev:web` or `bun run dev:ios`
5. Apply [`supabase/migrations/0001_initial_schema.sql`](/Users/zbkutlow/splitsy_app/supabase/migrations/0001_initial_schema.sql) to your Supabase project
6. Replace the placeholder EAS project id in [`apps/expo/app.json`](/Users/zbkutlow/splitsy_app/apps/expo/app.json) after `eas init`

## Deploy

- Web export: `bun --cwd apps/expo run export:web`
- Mobile builds: `eas build --profile preview --platform ios` or `eas build --profile preview --platform android`
- Config lives in [`eas.json`](/Users/zbkutlow/splitsy_app/eas.json)

## Current scaffold boundaries

- Shared persisted data is wired for Supabase, but local mock data is used when env vars are missing.
- Exchange-rate fetching is abstracted behind a service and currently seeded with sample rates.
- Settlement supports equal splitting among the selected participants only.
