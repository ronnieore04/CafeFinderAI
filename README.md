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

## Roadmap

- [ ] Seed ~50-100 cafes in one neighborhood, manually tagged
- [ ] Map + filter view against seed data
- [ ] Rule-based "best for" labels
- [ ] Onboarding quiz + tag-overlap matching
- [ ] Friend accounts + shared saves
- [ ] Review-mining pipeline to scale tagging beyond manual entry
