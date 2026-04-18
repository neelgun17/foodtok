# Food Map

A TikTok-inspired food discovery app built for final demo day. The current demo focuses on three cumulative enhancements:

- `Capture Spot`: upload photos or a short video, extract the restaurant details with Gemini, confirm the fields, and save the spot to the map
- `Find Friends`: create a handle, add friends through Supabase, and see shared spots appear live
- `Plan My Night`: turn saved spots into a routed night-out itinerary with Gemini tool use

## Setup

```bash
cd food-map
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

Only these env vars are required for the current app:

```bash
GEMINI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

`GEMINI_API_KEY` powers both capture extraction and `Plan My Night`. The Supabase URL and anon key power anonymous auth, friend requests, shared spots, and realtime updates.

## Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS
- Zustand with localStorage persistence
- Leaflet / react-leaflet
- Gemini via `@google/genai`
- Supabase for auth, friend graph, shared spots, and realtime

## Demo Flows

### Capture Spot
- Open the `+` capture sheet
- Use the Franklin sample set or upload your own photos/video
- Confirm the extracted fields
- Geocode the address and save the spot

### Find Friends
- Claim a handle
- Send a friend request from account A to account B
- Accept on B
- Share a captured or saved spot and confirm it appears live

### Plan My Night
- Save a few East Austin spots from the feed
- Use a brief like `date night Saturday, drinks then dinner then dessert, walkable, under $120 total`
- Confirm the numbered route, walking summary, and reservation link

## Recommended Demo Seed Spots

Before recording, save these from the feed so the itinerary flow has dependable data:

- `Suerte`
- `Launderette`
- `Dolce Neve Gelato`
- `Intero`
- `Via 313 East 6th`

These give you strong date-night, dinner, dessert, and walkable-cluster examples in East Austin.

## Verification

Run:

```bash
npm run lint
```

If `next build` is blocked by an existing `.next` lock, stop the running dev/build process first or build in a clean session.

## Deploy To Vercel

This app uses `Next.js` App Router API routes under `src/app/api`, so the simplest free deployment is `Vercel Hobby`.

1. Push the repo to GitHub.
2. Create a Supabase project.
3. In Supabase Auth, enable anonymous sign-ins.
4. In the Supabase SQL Editor, run [`supabase/migrations/0001_init.sql`](./supabase/migrations/0001_init.sql).
5. In Vercel, import the GitHub repo and keep the framework preset as `Next.js`.
6. Add these production env vars in Vercel:

```bash
GEMINI_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

7. Deploy on the Hobby tier.

### Post-Deploy Checks

- Open `/` and `/map`.
- Confirm anonymous sign-in works and you can claim a handle.
- Confirm friend requests and shared spots update live.
- Confirm capture extraction works through `/api/extract`.
- Confirm itinerary generation works through `/api/plan`.
- Confirm address lookup works through `/api/geocode`.
