# Roam Scotland — ride guide

An interactive web-based route guide for the **Roam Scotland** rallies. Displays daily route information with support for two route variants (Rugged and Rolling), powered by live data from a Google Sheet. Installable as a phone app and works offline once loaded.

## Features

- **Route toggle** — switch between Rugged and Rolling variants with instant UI updates
- **Expandable day cards** — distance, elevation, surface type, endpoints and GPS file per day
- **Shops & cafés** — opening times, locations, and details along each route
- **Camping & accommodation** — options with distance and booking info
- **Optional spoke card** — an extra epic variant with access/warning information
- **Live data** — fetches fresh CSV from the Google Sheet on every load
- **Edit mode** — shows the sheet tab, column and cell behind every value on the page
- **Installable + offline** — PWA manifest and a service worker that caches the page and the last data
- **Mobile-friendly** — responsive, touch-friendly, no runtime dependencies

## Getting Started

No build step required — this is a static single-page application.

### 1. Set up your Google Sheet

| Tab | Columns | Required |
|---|---|---|
| `Days` | day, title, rugged_end, rugged_distance, rugged_elevation, rolling_end, rolling_distance, rolling_elevation, surface, rugged_gps, rolling_gps, label, emoji | yes |
| `Shops` | day, name, rugged, rolling, opens, location, details | yes |
| `Accommodation` | day, name, rugged, rolling, details, location | yes |
| `Config` | field, value | no |
| `Optional` | field, value | no |

`Config` and `Optional` are key/value tabs: the setting name goes in the `field`
column, the text in the `value` column. Both tabs are optional — leave them out
entirely and the page still works.

The full, always-current list — including what each column controls on the page
and which are required — is built into the app: open **Edit → Field reference**
in the header.

### 2. Share the sheet

**Share → General access → Anyone with the link → Viewer.**

Data is read through the Google Visualization endpoint
(`/gviz/tq?tqx=out:csv&sheet=…`), which needs only link sharing — not
*File → Publish to web*. See [Reading the sheet](#reading-the-sheet) below.

### 3. Serve and open

```
https://your-site.com/index.html?sheet=YOUR_GOOGLE_SHEET_ID
```

For local development:

```bash
python3 -m http.server 8000
# then open http://localhost:8000/index.html?sheet=YOUR_SHEET_ID
```

The sheet ID is remembered after the first visit — it resolves from
`?sheet=` → `#sheet=` → cookie → localStorage, so an installed home-screen app
keeps working when iOS strips the URL.

## Editing the data

Everything on the page comes from a cell in the sheet. To find the cell behind
any value, tap **✎ Edit** in the header (or add `&edit=1` to the URL). In edit
mode:

- Every value grows a small badge naming its **tab and column**. Tapping the
  badge opens that tab and cell in Google Sheets.
- Empty fields and empty sections become visible prompts — *"add location"*,
  *"Add a row to the Shops tab with day = 3"* — so it is obvious what is
  missing rather than silently blank.
- A banner lists anything wrong with the sheet: missing required columns,
  mistyped column and field names (with a suggested correction), and rows
  pinned to a day that does not exist. Errors that break the page are shown to
  everyone; warnings only appear in edit mode.
- The toolbar shows when the data was last loaded, links to the sheet, and
  offers a reload.
- **Field reference** lists every tab, every column, what each one drives, and
  what is set in the code rather than the sheet.

Edit mode is reflected in the URL, so `...&edit=1` can be shared with whoever
maintains the sheet.

**One caveat on the deep links.** Jumping to an exact tab and cell needs each
tab's `gid`, which the app can only discover from the sheet's *published*
document (`/pubhtml`). On a sheet that is link-shared but not published, that
lookup fails and every badge falls back to linking the sheet's front page — the
badge still names the right tab, column and cell. Publish the sheet as well
(**File → Share → Publish to web**) if you want the links to land on the cell.

### Page-wide settings — the `Config` tab

| field | Controls |
|---|---|
| `page_title` | Title in the blue header bar |
| `page_subtitle` | Small line under the title, hidden when empty |
| `logo` | Image on the loading splash screen (defaults to `icon.png`) |
| `show_route_toggle` | `false` hides the Rugged/Rolling buttons for a single-route ride |
| `route_rugged_label` | Label on the first route toggle button |
| `route_rolling_label` | Label on the second route toggle button |

### The optional spoke card — the `Optional` tab

Set `title`, `distance`, `elevation`, `warning` and `access`, plus numbered
`shop_1_name` / `shop_1_opens` and `accommodation_1_name` /
`accommodation_1_details` entries. With no `title`, no card is shown.

Colours, layout, the two route variants themselves, and the section headings are
set in the code, not the sheet — the field reference panel says so explicitly.

### Customising the "Day" label

By default each card is titled `Day 1`, `Day 2`, and so on. For routes that
aren't split into days you can change this word to something like `Section`,
`Leg`, or `Stage` in two ways:

- **Per sheet** — add an optional `label` column to the `Days` tab. Any non-empty
  value in a row overrides the word for that row.
- **Per link** — add `&label=Section` to the URL. This applies to every card
  that doesn't set its own `label` column value.

Resolution order is: the row's `label` column → the `label` URL parameter → `Day`.

## Reading the sheet

Data is fetched per tab from the Google Visualization endpoint:

```
https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/tq?tqx=out:csv&sheet={TAB}
```

It needs no API key and no OAuth — only link sharing — and returns data much
closer to live than the `/pub?output=csv` publish endpoint, which serves from a
cache that can lag several minutes.

One quirk to know about: gviz tries to detect which row is the header, and gets
it wrong on tabs with very few rows, swallowing one. The key/value tabs
(`Config`, `Optional`) are therefore requested with `&headers=0`, which turns
detection off and lets the app's own parser handle the header row.

## URL parameters

| Parameter | Effect |
|---|---|
| `sheet` | Google Sheet ID to load. Remembered after the first visit. |
| `label` | Word before each number, e.g. `Section`. |
| `edit` | `1` starts the page in edit mode. |

## Tests

End-to-end tests run against a real browser with the Google Sheets requests
served from the CSV files in `csv/`, so no network or live sheet is needed.

```bash
npm install
npx playwright test
```

Service workers are blocked in the test run: left enabled, the worker serves
fetches from inside itself and bypasses the route interception the tests rely on.

There is also a screenshot script for eyeballing changes:

```bash
python3 -m http.server 8080 &
npm run screenshot   # writes /tmp/screenshot_*.png
```

## Deployment

The site is served by GitHub Pages. Check **Settings → Pages** for the branch it
builds from, and note that `sw.js` caches `index.html` — bump `CACHE_NAME` in
`sw.js` whenever the page changes, or returning visitors keep the old version.

## Project Structure

```
index.html          # Complete application (HTML + CSS + JS)
sw.js               # Service worker (offline cache)
manifest.json       # PWA manifest
icon.png            # App icon and splash logo
csv/                # Sample CSV data files
  config.csv  days.csv  shops.csv  accommodation.csv  optional.csv
  easter/           # A second event's data
tests/              # Playwright end-to-end tests
test/screenshot.js  # Screenshot script with mocked sheet data
```

## Tech Stack

Vanilla HTML, CSS, and JavaScript — no frameworks or runtime dependencies.
Playwright is a development dependency, used only for the tests.
