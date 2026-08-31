const fs = require('fs');
const path = require('path');

const CSV_DIR = path.join(__dirname, '..', 'csv');
const read = f => fs.readFileSync(path.join(CSV_DIR, f), 'utf8');

// The five tabs exactly as the sample sheet ships them.
const DEFAULT_TABS = () => ({
  Config: read('config.csv'),
  Days: read('days.csv'),
  Shops: read('shops.csv'),
  Accommodation: read('accommodation.csv'),
  Optional: read('optional.csv'),
});

const DEFAULT_GIDS = { Days: '0', Shops: '111', Accommodation: '222', Optional: '333', Config: '444' };

function pubhtml(gids) {
  const items = Object.entries(gids)
    .map(([name, gid]) => `<li id="sheet-button-${gid}" class="switcherItem"><a target="_self" href="#gid=${gid}">${name}</a></li>`)
    .join('');
  return `<html><body><ul id="sheet-menu">${items}</ul></body></html>`;
}

/**
 * Serves the app's Google Sheets requests from local fixtures.
 *   tabs   - map of tab name to CSV text; a tab set to null 404s
 *   gids   - map of tab name to gid, or null to make gid discovery fail
 */
async function mockSheet(page, { tabs = DEFAULT_TABS(), gids = DEFAULT_GIDS } = {}) {
  await page.context().route(/docs\.google\.com/, async route => {
    const url = route.request().url();
    if (url.includes('/pubhtml')) {
      if (!gids) return route.fulfill({ status: 500, body: 'nope' });
      return route.fulfill({ status: 200, contentType: 'text/html', body: pubhtml(gids) });
    }
    const tab = new URL(url).searchParams.get('sheet');
    const body = tabs[tab];
    if (body == null) return route.fulfill({ status: 400, body: 'no such sheet' });
    return route.fulfill({ status: 200, contentType: 'text/csv', body });
  });
}

const SHEET_ID = 'TEST_SHEET_ID';
const appURL = (params = '') => `/index.html?sheet=${SHEET_ID}${params}`;

// Waits for the splash screen to fade and the content to be revealed.
async function ready(page) {
  await page.locator('#main-header').waitFor({ state: 'visible', timeout: 15000 });
}

// Rebuilds a CSV with a header renamed, to simulate a mistyped column.
function renameColumn(csv, from, to) {
  const lines = csv.split('\n');
  lines[0] = lines[0].split(',').map(h => (h.trim() === from ? to : h)).join(',');
  return lines.join('\n');
}

// Blanks one column in every data row.
function blankColumn(csv, column) {
  const lines = csv.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const idx = headers.indexOf(column);
  return lines.map((line, i) => {
    if (i === 0 || !line.trim()) return line;
    const cells = line.split(',');
    cells[idx] = '';
    return cells.join(',');
  }).join('\n');
}

module.exports = { mockSheet, appURL, ready, SHEET_ID, DEFAULT_TABS, DEFAULT_GIDS, renameColumn, blankColumn, read };
