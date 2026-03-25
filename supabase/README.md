# Supabase Setup

## Auth

- Enable Google provider in Supabase Auth.
- Add the Expo redirect scheme `splitsy://` and your web callback URL.
- Mirror the anon key and project URL into `apps/expo/.env`.

## Data model

- `users`: profile row keyed by Supabase auth user id
- `trips`: trip metadata and trip settlement currency
- `trip_members`: per-trip people, with optional linked auth user for the owner or future invite redemption
- `expenses`: original amount, original currency, locked trip conversion rate, locked trip amount, category, note, payer trip member
- `expense_participants`: which trip members were included in the split

## Notes

- The scaffold stores a locked `trip_conversion_rate` per expense so later settlement does not drift with live FX changes.
- Realtime subscriptions are intentionally deferred; the current app shape assumes fetch-on-load plus manual refresh.
