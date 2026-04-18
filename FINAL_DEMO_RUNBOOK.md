# Final Demo Runbook

## Demo Goal

Show clear cumulative progress from the previous save-to-map MVP by walking through the three headline enhancements:

1. `Capture Spot`
2. `Find Friends`
3. `Plan My Night`

## Before You Record

### Environment
- confirm `GEMINI_API_KEY` is set
- confirm `NEXT_PUBLIC_SUPABASE_URL` is set
- confirm `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set

### Data Prep
- save these spots from the feed on the main demo account:
  - `Suerte`
  - `Launderette`
  - `Dolce Neve Gelato`
  - `Intero`
  - `Via 313 East 6th`
- keep the Franklin sample capture set available for the fallback capture demo
- prepare a second browser or incognito session for the friend-request flow

### Verification
- run `npm run lint`
- open the app once locally and confirm:
  - capture sheet opens
  - Gemini extraction returns structured data
  - Supabase sign-in/handle flow works
  - friend request works
  - route and reservation link render for the planning flow

## Primary Demo Script

### 1. Value Proposition Opening (45-60s)
- Target user: people who constantly save food spots from TikTok but forget where they are or how to turn them into a real plan.
- Problem: discovery happens in short-form video, but decision-making still happens somewhere else.
- Why it matters: Food Map keeps discovery, social proof, and planning in one place so saved spots become actual nights out.

### 2. Live Walkthrough (2-2.5 min)

#### Capture Spot
- open the `+` capture sheet
- use the Franklin sample set or upload a short real clip
- show Gemini extracting the restaurant name, dishes, and address
- edit one field if needed
- save the spot and show it appear on the map

#### Find Friends
- open the Friends panel
- show the main account handle
- send a request from the second account or accept an incoming request
- share a spot and show it appear live

#### Plan My Night
- open `Plan My Night`
- use this brief:

```text
date night Saturday, drinks then dinner then dessert, walkable, under $120 total
```

- show the route, numbered pins, summary, and reservation link

### 3. Cumulative Progress (1.5-2 min)
- `Capture Spot`
  - What changed: moved from feed-only saves to in-app image/video capture with Gemini extraction.
  - Why: the old MVP still depended on mock feed interactions and did not let the user add their own discovery moments.
  - Result: users can add a new restaurant without leaving the app.
- `Find Friends`
  - What changed: added handles, friend requests, and live shared spots through Supabase.
  - Why: food discovery is social, and saved spots become more valuable when they can be shared.
  - Result: a second user can follow along and see new spots without a refresh.
- `Plan My Night`
  - What changed: added a Gemini-powered itinerary builder on top of saved spots.
  - Why: saving spots is useful, but planning an actual night out is the harder user problem.
  - Result: the app now turns saved restaurants into a real route with a reservation CTA.

### 4. Reflection Close (30-45s)
- What worked: the app now connects discovery, social context, and planning in one flow.
- What did not: the social import layer is still partially mocked and the demo depends on stable third-party services.
- What is next: live deployment, stronger onboarding, and more robust recommendation/ranking logic.

## Fallback Moves

### If capture is slow
- use the Franklin sample set instead of recording live

### If social setup gets flaky
- demo an already-connected pair of accounts and publish a spot live

### If route quality is weak
- use the East Austin seed set and the exact scripted brief above
