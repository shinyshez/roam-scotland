# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Static single-page application for the Roam Scotland rallies — a mobile ride
guide showing daily route info with two variants (Rugged/Rolling), powered by
live Google Sheets data. Vanilla HTML/CSS/JS with zero runtime dependencies.
Installable as a PWA with offline support.

## Development

**Local server:**
```bash
python3 -m http.server 8000
# Open http://localhost:8000/index.html?sheet=YOUR_SHEET_ID
# Add &edit=1 to see the tab/column behind every value
```

**Install test dependencies:**
```bash
npm install
```
Chromium is expected to be already available to Playwright.

**Run the end-to-end tests:**
```bash
npx playwright test
```
Tests intercept the Google Sheets requests and serve the CSV files in `csv/`, so
they need no network and no live sheet. `playwright.config.js` starts the static
server itself and blocks service workers — left enabled, the worker serves
fetches from inside itself and bypasses route interception.

**Screenshots:**
```bash
python3 -m http.server 8080 &
npm run screenshot   # writes /tmp/screenshot_*.png
```

## Architecture

**Everything lives in `index.html`** — a single file containing all HTML, CSS and
JavaScript. Alongside it: `sw.js` (offline cache), `manifest.json`, `icon.png`.

**Data flow:** sheet ID (`?sheet=` → `#sheet=` → cookie → localStorage) → fetch
each tab as CSV → custom parser → JavaScript objects → DOM rendering.

**`SCHEMA` is the single source of truth.** It declares every tab and column,
what each drives on the page, and whether it is required. The field tooltip, the
field reference panel and the validation banner are all generated from it — when
adding or renaming a column, update `SCHEMA` and everything else follows. Do not
hard-code a column name anywhere else.

**Key globals:**
- `days` — array of day objects, each with rugged/rolling variants, shops, accommodation
- `optional` — the extra spoke card, or `null` when the Optional tab describes none
- `settings` — page-wide settings from the Config tab
- `currentRoute` — `"rugged"` or `"rolling"`
- `editMode` — whether source badges and prompts are shown
- `TAB_HEADERS` / `TAB_GIDS` / `KV_ROWS` — used to turn a value into an A1 cell reference
- `tipTarget` — the field whose tooltip is currently open, if any

**Field tooltip:** `mark()` wraps every sheet-driven value in a `.fld` span
carrying `data-tab` / `data-col` / `data-ref`. A single reused `#fld-tip` card
reads those on hover or tap. It deliberately does **not** call
`stopPropagation`, so taps still reach the route buttons, the card headers and
the five-tap diagnostics; adding it back would break all three.

**Row tracing:** `parseCSV` returns `{ headers, rows }` and stamps each row with
`__row`, its 1-based position among the data rows. A value's cell is
`colLetter(headerIndex) + (__row + 1)` — the `+1` skips the header row. On
key/value tabs the column is always `value`, keyed by the `field` name.

**Rendering:** the route toggle and edit toggle trigger a full re-render of all
cards. Direct DOM manipulation, no virtual DOM. All sheet content is escaped via
`esc()` before it reaches `innerHTML`.

**Empty values** are rendered as hidden prompts (`is-empty` + a ghost span)
rather than omitted, so edit mode can reveal what is missing without changing
what a reader sees.

## Google Sheets access

```
https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={TAB}
```

Needs link sharing only — no API key, no publish-to-web. gviz mis-detects the
header row on tabs with few rows, so the key/value tabs (`Config`, `Optional`)
are requested with `&headers=0` and the app parses the header itself. Do not
remove that flag.

Deep links to a cell need each tab's `gid`, which is only discoverable from
`/pubhtml` — that exists only if the sheet is *also* published. When it fails,
the tooltip link falls back to the sheet's front page while still naming the
cell; keep that fallback path working.

## CSV Data Schema

| Tab | Key columns | Required |
|---|---|---|
| Days | day, title, rugged_end/distance/elevation/gps, rolling_end/distance/elevation/gps, surface, label, emoji | yes |
| Shops | day, name, rugged, rolling, opens, location, details | yes |
| Accommodation | day, name, rugged, rolling, details, location | yes |
| Config | field, value — page_title, page_subtitle, logo, show_route_toggle, route_*_label | no |
| Optional | field, value — title, distance, elevation, warning, access, shop_N_*, accommodation_N_* | no |

Both key/value tabs use `field` and `value` as their column headers. Sample CSV
files in `csv/` mirror this schema; `csv/easter/` holds a second event's data.

## Deployment

GitHub Pages. Check **Settings → Pages** for the branch it builds from — it has
drifted off `main` before, which silently strands merged work.

`sw.js` caches `index.html`, so **bump `CACHE_NAME` whenever the page changes**
or returning visitors keep the old version.
