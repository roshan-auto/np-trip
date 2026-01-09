# New Plymouth Lights Trip Plan (GitHub Pages)

## Upload to GitHub Pages
1. Create a GitHub repo (e.g. `new-plymouth-trip`)
2. Upload **all files/folders** from this zip to the repo root
3. GitHub → Settings → Pages → Deploy from branch → `main` / `(root)`

## Replace images
All images are local placeholders in `/images` (SVG). Replace them with your own JPG/PNG/SVG:
- Keep the same filenames (e.g. `bason.svg`) OR
- Update filenames in `assets/data.js`

## Weather
The page fetches live **hourly** forecasts from Open‑Meteo (no API key).
If your network blocks it, the page will show a friendly message.

## Map
The on-page map uses Leaflet + OpenStreetMap via CDN.
If blocked, everything else still works via Google Maps buttons.
