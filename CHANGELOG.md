# Changelog

## V1 — Core MVP (Initial)

**What:** Feed page with 8 mock food review cards + "Save to Food Map" button + Food Map page with interactive Leaflet map and saved spots list.

**Why:** Establish the two core user flows — saving from feed and viewing on map — as the foundation.

**Result:** User can browse feed, save restaurants, and see them on an interactive map with pins. Data persists in localStorage.

---

## V1.1 — Idempotent Save + Toast Notifications

**What:** Added idempotent save logic (can't double-save the same video) and toast notifications on save.

**Why:** Prevents duplicate entries and gives clear feedback. Without a toast, users don't know if the save worked. Without idempotency, spamming the button creates duplicates.

**Result:** Button changes to "Saved" (green, disabled state) after saving. Toast appears at top confirming "Saved [restaurant name]!". Pressing the button again does nothing.

---

## V1.2 — Search/Filter + Map Pin/List Sync

**What:** Added a search bar on the Food Map page that filters by restaurant name, dish, city, or neighborhood. Added bidirectional sync between map pins and list items — clicking a pin highlights and scrolls to the list item; clicking a list item flies the map to that pin.

**Why:** As users save more spots, they need to find specific ones quickly. The map/list sync makes the spatial connection between the two views intuitive.

**Result:** Typing "ramen" filters to just ramen spots. Clicking a map pin scrolls the sidebar list. Clicking a list card flies the map with smooth animation. Active item has a red border highlight.

---

## V1.3 — Detail Modal with Notes + Ordering Links

**What:** Added a detail modal/drawer that shows full restaurant info, dish tags, a notes field (persisted to localStorage), video link, and ordering buttons (DoorDash, Uber Eats, Website).

**Why:** Users need a way to add personal reminders ("get the spicy ramen") and quickly act on saved spots via ordering. This bridges the gap from "saved" to "ordered."

**Result:** Click "Details" on any saved spot to open a modal. Notes auto-save on blur. Three ordering buttons link to respective platforms. Video link included. Notes display as italicized text in the list view.

---

## V1.4 — Dish Tag Chips + Hours Display

**What:** Styled dish names as rounded pill/chip components throughout the app (feed cards, map list, detail modal). Added mock operating hours to restaurant data shown in cards and detail view.

**Why:** Chips make dishes scannable at a glance and add visual polish. Hours address the core problem statement — users see food late at night when restaurants are closed.

**Result:** Dishes render as red-tinted pill badges. Hours show with a clock icon in feed cards, map list items, and the detail modal.
