# RSR Far North 2025

An interactive web-based route guide for the **Roam Scotland — Far North** multi-day cycling expedition through northern Scotland. Displays daily route information with support for two route variants (Rugged and Rolling), powered by live data from Google Sheets.

## Features

- **Route toggle** — switch between Rugged and Rolling variants with instant UI updates
- **Expandable day cards** — distance, elevation, surface type, and endpoints for each day
- **Shops & cafés** — opening times, locations, and details along each route
- **Camping & accommodation** — options with distance and booking info
- **Cape Wrath spoke** — optional epic variant with access/warning information
- **Live data** — fetches fresh CSV data from Google Sheets on every load
- **Edit mode** — shows the sheet tab, column and cell behind every value on the page
- **Mobile-friendly** — responsive, touch-friendly design with no runtime dependencies

## Getting Started

No build step required — this is a static single-page application.

### 1. Set up your Google Sheet

Create a Google Sheet with four tabs:

| Tab | Columns |
|---|---|
| `Days` | day, title, rugged_end, rugged_distance, rugged_elevation, rolling_end, rolling_distance, rolling_elevation, surface, _label_, _emoji_ |
| `Shops` | day, name, rugged, rolling, opens, location, details |
| `Accommodation` | day, name, rugged, rolling, details, location |
| `Optional` | field, value |

Italic columns are optional. The full, always-current list — including what each
column controls on the page — is built into the app itself: open **Edit → Field
reference** in the header.

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

## Editing the data

Everything on the page comes from a cell in the sheet. To find the cell behind
any value, tap **✎ Edit** in the header (or add `&edit=1` to the URL). In edit
mode:

- Every value grows a small badge naming its **tab and column**. Tapping the
  badge opens that exact tab and cell in Google Sheets.
- Empty fields and empty sections become visible prompts — *"add location"*,
  *"Add a row to the Shops tab with day = 3"* — so it is obvious what is
  missing rather than silently blank.
- A banner lists anything wrong with the sheet: missing required columns,
  mistyped column names (with a suggested correction), and rows pinned to a day
  that does not exist. Errors that break the page are shown to everyone;
  warnings only appear in edit mode.
- The toolbar shows when the data was last loaded, links to the sheet, and
  offers a reload. Google's publish cache can lag a few minutes behind an edit,
  so a change may not appear immediately.
- **Field reference** lists every tab, every column, what each one drives, and
  what is set in the code rather than the sheet.

Edit mode is reflected in the URL, so `...&edit=1` can be shared with whoever
maintains the sheet.

### Page-wide settings

The `Optional` tab is a list of key/value pairs: put the key in the `field`
column and the text in the `value` column. Alongside the optional spoke card, it
sets:

| field | Controls |
|---|---|
| `page_title` | Title in the blue header bar |
| `page_subtitle` | Small line under the title, hidden when empty |
| `route_rugged_label` | Label on the first route toggle button |
| `route_rolling_label` | Label on the second route toggle button |

The optional spoke card at the bottom of the page only appears once the
`Optional` tab describes one (`title`, `distance`, `elevation`, `warning`,
`access`, and numbered `shop_1_name` / `accommodation_1_name` entries).

Colours, layout, the two route variants themselves, and the section headings are
set in the code, not the sheet — the field reference panel says so explicitly.

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

## URL parameters

| Parameter | Effect |
|---|---|
| `sheet` | Google Sheet ID to load. Required. |
| `label` | Word before each number, e.g. `Section`. |
| `edit` | `1` starts the page in edit mode. |

## Tests

End-to-end tests run against a real browser with the Google Sheets requests
served from the CSV files in `csv/`, so no network or live sheet is needed.

```bash
npm install
npx playwright test
```

## Project Structure

```
index.html          # Complete application (HTML + CSS + JS)
csv/                # Sample CSV data files
  days.csv
  shops.csv
  accommodation.csv
  optional.csv
tests/              # Playwright end-to-end tests
```

## Tech Stack

Vanilla HTML, CSS, and JavaScript — no frameworks or runtime dependencies.
Playwright is a development dependency, used only for the tests.
