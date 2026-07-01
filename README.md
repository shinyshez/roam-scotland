# RSR Far North 2025

An interactive web-based route guide for the **Roam Scotland — Far North** multi-day cycling expedition through northern Scotland. Displays daily route information with support for two route variants (Rugged and Rolling), powered by live data from Google Sheets.

## Features

- **Route toggle** — switch between Rugged and Rolling variants with instant UI updates
- **Expandable day cards** — distance, elevation, surface type, and endpoints for each day
- **Shops & cafés** — opening times, locations, and details along each route
- **Camping & accommodation** — options with distance and booking info
- **Cape Wrath spoke** — optional epic variant with access/warning information
- **Live data** — fetches fresh CSV data from Google Sheets on every load
- **Mobile-friendly** — responsive, touch-friendly design with no dependencies

## Getting Started

No build step required — this is a static single-page application.

### 1. Set up your Google Sheet

Create a Google Sheet with four tabs:

| Tab | Columns |
|---|---|
| `Days` | day, title, rugged_end, rugged_distance, rugged_elevation, rolling_end, rolling_distance, rolling_elevation, surface, _label (optional)_ |
| `Shops` | day, name, rugged, rolling, opens, location, details |
| `Accommodation` | day, name, rugged, rolling, details, location |
| `Optional` | key, value |

### 2. Publish the sheet

**File → Share → Publish to web → Entire document → CSV**

### 3. Serve and open

Serve the project with any static file server and pass your sheet ID as a URL parameter:

```
https://your-site.com/index.html?sheet=YOUR_GOOGLE_SHEET_ID
```

For local development:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/index.html?sheet=YOUR_SHEET_ID
```

### Customising the "Day" label

By default each card is titled `Day 1`, `Day 2`, and so on. For routes that
aren't split into days you can change this word to something like `Section`,
`Leg`, or `Stage` in two ways:

- **Per sheet** — add an optional `label` column to the `Days` tab. Any non-empty
  value in a row overrides the word for that row (mixing is allowed, e.g. `Day`
  for some rows and `Section` for others).
- **Per link** — add `&label=Section` to the URL. This applies to every card
  that doesn't set its own `label` column value.

Resolution order is: the row's `label` column → the `label` URL parameter → `Day`.

## Project Structure

```
index.html          # Complete application (HTML + CSS + JS)
csv/                # Sample CSV data files
  days.csv
  shops.csv
  accommodation.csv
  optional.csv
```

## Tech Stack

Vanilla HTML, CSS, and JavaScript — no frameworks or external dependencies.
