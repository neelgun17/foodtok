# Canvas Submission Draft

## A. Value Proposition

Food Map is for people who constantly discover restaurants through TikTok and Instagram but struggle to turn those saves into real decisions later. The problem is that discovery happens in one place while mapping, sharing, and planning happen somewhere else. My product matters because it keeps the full workflow in one app: capture a spot, save it to a personal map, share it with friends, and generate a plan for an actual night out.

## B. Product Overview

- Food Map is a web app built with Next.js, TypeScript, and React.
- It lets users save restaurant discoveries to a map, review details, and organize places they want to try.
- The final version adds three major enhancements: in-app capture with Gemini extraction, social friend discovery with shared spots, and an itinerary planner.
- Mapping is handled with Leaflet, local persistence uses Zustand, and social/realtime features use Supabase.
- The build is code-assisted but fully implemented in code rather than no-code tooling.

## C. What Changed Since Last Demo

- Added in-app capture flow for photos and video keyframes
- Added Gemini-based restaurant extraction for captured media
- Added editable confirmation before saving captured spots
- Added friend handles and anonymous sign-in flow
- Added friend requests and acceptance flow
- Added shared spot publishing with Supabase realtime updates
- Added `Plan My Night` itinerary flow with Gemini tool use
- Added walking route rendering with numbered stops
- Added reservation-link generation for dinner stops

## D. Enhancement Detail

### 1. Capture Spot
What changed: I added an in-app capture flow where the user can upload photos or a short video, let Gemini extract the restaurant details, edit the result, and save it directly to the map. Why I changed it: the previous version only let users save from a mock feed, which made the product feel limited and less real. Result: better, because the app can now ingest a new restaurant without making the user leave the product.

### 2. Find Friends
What changed: I added handles, friend requests, and live shared spots using Supabase. Why I changed it: food discovery is social, and the app becomes more useful when saved spots can move between people instead of staying in one local browser. Result: better, because a second account can see new spots appear live without refreshing.

### 3. Plan My Night
What changed: I added a Gemini-powered itinerary planner that selects saved spots, orders them into a route, and creates a reservation link. Why I changed it: saving restaurants is only part of the problem; the harder step is deciding where to go tonight. Result: better, because the app now turns saved spots into an actionable plan rather than just a list.

## E. Self-Assessment

### Biggest remaining product or technical risk
The biggest remaining risk is reliability across third-party services, especially Gemini, Supabase, and external routing/geocoding APIs during a live demo.

### What I would improve with more time
With more time, I would deploy the app publicly, replace the partially mocked contact-import layer with a real device-permission flow, and improve the planner with stronger ranking and richer constraints.

### What I learned this semester about building products
I learned that iteration matters more than trying to make the first version perfect. The most useful improvements came from tightening the workflow around the user problem instead of only adding standalone features.
