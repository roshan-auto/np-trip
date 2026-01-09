# Developer Spec — Trip Plan (GitHub Pages)

## Goal
A single-page, mobile-friendly itinerary that family members can open on any device and:
- See a clear timeline (expand/collapse)
- Open each stop in Maps, or get directions from their current location
- View an overview map with all stops plotted
- See hourly weather forecasts for the trip days
- Tap contacts to call quickly

## Tech constraints
- Must run on **GitHub Pages** (static hosting)
- No server required
- No paid APIs required for basic functionality
- Works even if some external services are blocked (graceful fallback)

## Architecture
- `index.html` — layout + containers only
- `assets/data.js` — single source of truth for trip content (stops, dates, contacts, accommodation)
- `assets/app.js` — renders UI, builds Google Maps links, loads map + weather
- `assets/styles.css` — styling
- `/images/*` — local images (placeholders included)

## Data model (assets/data.js)
`window.TRIP_DATA = { ... }`:
- `tripTitle`, `subtitle`
- `dates`: `{ day1, day2, timezone }`
- `contacts`: `[{ name, phone }]`
- `accommodation`: `{ address, checkIn, checkOut }`
- `stops`: array of stop objects:
  - `id` (string, unique)
  - `day` (1 or 2)
  - `time` (string)
  - `title`, `subtitle`, `description`
  - `query` (string used for maps searches)
  - `lat`, `lng` (numbers for map marker)
  - `image` (local path)
  - optional: `website` (info link), `optional` (boolean)

## Maps behavior
- On-page map uses Leaflet + OpenStreetMap tiles via CDN.
- Markers are placed using `lat/lng` from data.
- A simple polyline connects stops in order (visual plan, not a road route).
- True driving route + total km/time: "Full route in Google Maps" uses `maps/dir` with waypoints.
- "Use my location" sets origin to GPS lat/lng when allowed; otherwise uses "Current Location".

## Weather behavior
- Uses Open‑Meteo (no key) for **hourly** forecast:
  - fetch URL: `/v1/forecast?...&hourly=temperature_2m,precipitation_probability,wind_speed_10m,weathercode`
  - timezone: `Pacific/Auckland`
- UI: location dropdown + day dropdown + refresh button
- Graceful fallback on fetch error (message shown)

## UX requirements
- Expand/collapse timeline entries (HTML `<details>`).
- Buttons for each stop:
  - Open on Map (search)
  - Get Directions (from current location)
  - Info page (optional, if `website` exists)
- Clear optional-stop toggle (Water Tower).
- Responsive layout:
  - two-column header on desktop, single column on mobile

## Extensibility ideas
- Add "Kids mode" filter (only playground-friendly stops)
- Add estimated durations + auto reminders
- Add packing checklist with localStorage
- Add printable PDF export (client-side)
