# Food Map — Save TikTok Food Spots

A TikTok-style "Save to Food Map" MVP. Browse a simulated food review feed, save restaurants to your personal food map, and view them on an interactive map with ordering links.

## Setup & Run

```bash
cd food-map
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Tech Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS** for styling
- **Zustand** with localStorage persistence for state
- **Leaflet / react-leaflet** for interactive maps
- **react-hot-toast** for notifications

## Demo Walkthrough (5-7 min)

1. **Open the Feed** (`/`) — Scroll through 8 TikTok-style food review cards
2. **Save a spot** — Tap "Save to Food Map" on any card. Toast confirms, button becomes "Saved checkmark"
3. **Notice the badge** — Bottom nav "Food Map" tab shows saved count
4. **Open Food Map** (`/map`) — See saved spots on an interactive map + list sidebar
5. **Click a map pin** — List item highlights and scrolls into view
6. **Click a list item** — Map flies to that location
7. **Search** — Type a dish name (e.g., "ramen") or city to filter
8. **Open details** — Click "Details" on a list item for modal with dishes, notes, ordering links
9. **Add a note** — Type "get the spicy ramen" and it persists across refresh
10. **Order links** — Click DoorDash / Uber Eats / Website buttons
11. **Remove a spot** — Click X on any saved item to unsave

## Known Limitations

- Mock data only (no real TikTok API or Google Places)
- Map uses OpenStreetMap free tiles
- No real authentication
- Ordering links go to search pages, not direct restaurant pages
- Video thumbnails are emoji placeholders
