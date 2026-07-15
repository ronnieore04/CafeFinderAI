# AI Cafe Finder

Find cafes matched to your vibe, work setup, and what your friends recommend.

## Core features (in build order)

1. **Map + filters** — noise level, outlets, seating type, wifi quality, vibe tags
2. **"Best for" labels** — studying / working / dates, derived from tags + user check-ins
3. **Preference matching** — short onboarding quiz, tag-overlap scoring against cafes
4. **Friend recs** — accounts, friend graph, shared saves/check-ins

## Stack

- **Frontend:** Next.js (App Router) + TypeScript + Tailwind, built PWA-friendly for mobile later
- **Backend/DB:** Supabase (Postgres + PostGIS for geo queries, Auth, Realtime)
- **Maps:** Mapbox GL JS for rendering, Google Places API for seed cafe data
- **Data ingestion:** `scripts/` — pulls candidate cafes from Google Places, manual amenity tagging for first seed city

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase + Mapbox + Google Places keys
npm run dev
```

## Data model

See `supabase/schema.sql` for the initial Postgres schema:

- `cafes` — core place data (name, location, address, hours, photos)
- `cafe_tags` — amenity/vibe data, kept separate so it can later be crowdsourced/edited independently
- `users` — profile + vibe preferences from onboarding
- `friendships` — friend graph
- `checkins` — user_id, cafe_id, purpose, rating — powers both "best for" labels and matching over time

## CI/CD

- **`.github/workflows/ci.yml`** — runs on every PR and every push to `main`: lint, typecheck, unit tests (Vitest), build. This is the gate that must pass before a PR can merge.
- **`.github/workflows/cd.yml`** — triggers after CI succeeds on `main`: applies Supabase migrations (`supabase/migrations/`) via the Supabase CLI. App deployment itself is handled by Vercel's GitHub integration, which auto-deploys on push to `main` independently — this workflow only covers the piece Vercel doesn't do (the database).

**Required GitHub Actions secrets** (Settings → Secrets and variables → Actions):
- `SUPABASE_ACCESS_TOKEN` — personal access token from your Supabase account
- `SUPABASE_PROJECT_ID` — the project ref of your (production) Supabase project

**Branching strategy:** trunk-based. Short-lived `feature/*` branches off `main`, opened as a PR, merged once CI passes.

## Roadmap

- [ ] Seed ~50-100 cafes in one neighborhood, manually tagged
- [ ] Map + filter view against seed data
- [ ] Rule-based "best for" labels
- [ ] Onboarding quiz + tag-overlap matching
- [ ] Friend accounts + shared saves
- [ ] Review-mining pipeline to scale tagging beyond manual entry
