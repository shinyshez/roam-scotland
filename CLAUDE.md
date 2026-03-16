# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static single-page application for the RSR Far North 2025 cycling expedition through northern Scotland. Displays daily route info with two variants (Rugged/Rolling), powered by live Google Sheets CSV data. Vanilla HTML/CSS/JS with zero runtime dependencies.

## Development

**Local server:**
```bash
python3 -m http.server 8000
# Open http://localhost:8000/index.html?sheet=YOUR_SHEET_ID
```

**Install test dependencies:**
```bash
npm install
npx playwright install chromium
```

**Run screenshot tests:**
```bash
# Requires a local server running on port 8080
python3 -m http.server 8080 &
node test/screenshot.js
```
Tests intercept Google Sheets requests with mock data and output screenshots to `/tmp/screenshot_*.png`.

## Architecture

**Everything lives in `index.html`** — a single file containing all HTML, CSS (~220 lines), and JavaScript (~300 lines).

**Data flow:** Google Sheet ID from URL param `?sheet=` → fetch four CSV tabs (Days, Shops, Accommodation, Optional) → custom CSV parser → JavaScript objects → DOM rendering.

**Key globals:**
- `days` — array of day objects, each with rugged/rolling variants, shops, and accommodation
- `optional` — Cape Wrath spoke data (parsed from key/value pairs)
- `currentRoute` — `"rugged"` or `"rolling"`, toggled by header buttons

**Rendering:** Route toggle triggers full re-render of all day cards. Day cards are expandable/collapsible with CSS transitions. No virtual DOM or diffing — direct DOM manipulation.

**Google Sheets URL pattern:** `https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={TAB_NAME}`

## CSV Data Schema

| Tab | Key columns |
|---|---|
| Days | day, title, rugged_end/distance/elevation/gps, rolling_end/distance/elevation/gps, surface |
| Shops | day, name, rugged, rolling, opens, location, details |
| Accommodation | day, name, rugged, rolling, details, location |
| Optional | key, value (flat key-value pairs) |

Sample CSV files in `csv/` directory mirror this schema.
