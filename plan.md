# Plan: Google Sheet → Live Webpage

## Overview
Replace the hardcoded JavaScript data in `index.html` with live data fetched from a publicly published Google Sheet. No backend needed — everything runs client-side.

## Google Sheet Structure

Create a Google Sheet with **3 tabs**:

### Tab 1: `Days`
| day | title | rugged_end | rugged_distance | rugged_elevation | rolling_end | rolling_distance | rolling_elevation | surface |
|-----|-------|------------|-----------------|------------------|-------------|------------------|-------------------|---------|
| 1 | Inverness → Bonar Bridge / Golspie | Golspie | 121 km | 1566 m | Bonar Bridge | 89 km | 1097 m | Road → Gravel |

### Tab 2: `Shops`
| day | name | rugged | rolling | opens | location | details |
|-----|------|--------|---------|-------|----------|---------|
| 1 | Evanton Co-op | 10 km | 10 km | TBC | | |

### Tab 3: `Accommodation`
| day | name | rugged | rolling | details | location |
|-----|------|--------|---------|---------|----------|
| 1 | Bonar Bridge / Golspie B&Bs & pods | 121 km | 89 km | TBC | |

### Tab 4: `Optional` (Cape Wrath)
| field | value |
|-------|-------|
| title | Cape Wrath Spoke |
| distance | ~96 km |
| ... | ... |

## How It Works

1. **Publish the sheet**: In Google Sheets → File → Share → Publish to web → select "Entire document" → CSV format. Each tab gets a URL like:
   `https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={TAB_NAME}`

2. **Fetch client-side**: On page load, `index.html` fetches each tab as CSV using the public URL (no API key needed).

3. **Parse CSV → JS objects**: Use a lightweight CSV parser (we'll write ~30 lines, no library needed) to convert rows into the same `days`, `shops`, and `accommodation` arrays currently hardcoded.

4. **Render as before**: The existing `renderDays()` function works unchanged — it just reads from the parsed data instead of hardcoded constants.

## Changes to `index.html`

1. **Remove** the hardcoded `days` and `optional` data objects
2. **Add** a config constant for the Google Sheet ID
3. **Add** a CSV fetch + parse function (~30-40 lines)
4. **Add** a `loadData()` async function that:
   - Fetches all tabs in parallel
   - Parses CSV into structured objects
   - Groups shops/accommodation by day number
   - Builds the `days` array
   - Calls `renderDays()`
5. **Add** a simple loading state while data fetches
6. **Add** basic error handling (show message if sheet can't be reached)

## What You'll Need To Do

1. Create the Google Sheet with the tabs/columns above
2. Populate it with the current data
3. Publish it to the web (File → Share → Publish to web)
4. Give me the Sheet ID (the long string in the URL)

## Trade-offs

- **Pro**: Edit the sheet anytime, page updates on next reload (no deploy needed)
- **Pro**: No API key, no backend, no build step
- **Pro**: Multiple people can edit the sheet simultaneously
- **Con**: ~0.5-1s loading delay on page open while CSV fetches
- **Con**: Google Sheets publish cache can take up to 5 minutes to reflect edits
