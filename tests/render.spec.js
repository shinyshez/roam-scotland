const { test, expect } = require('@playwright/test');
const { mockSheet, appURL, DEFAULT_TABS, blankColumn } = require('./helpers');

test.describe('baseline rendering', () => {
  test('renders a card per day plus the optional spoke', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL());
    await expect(page.locator('.day-card')).toHaveCount(8); // 7 days + optional
    await expect(page.locator('#optional-card')).toBeVisible();
  });

  test('shows the rugged distance, elevation and endpoint by default', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL());
    const first = page.locator('.day-card').first();
    await expect(first.locator('.day-title')).toContainText('Day 1');
    await expect(first.locator('.day-route')).toContainText('Inverness');
    await expect(first.locator('.day-route')).toContainText('Golspie');
    await expect(first.locator('.stat').first()).toContainText('121 km');
    await expect(first.locator('.stat').nth(1)).toContainText('1566 m');
  });

  test('the route toggle swaps in the rolling values', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL());
    await page.locator('#btn-rolling').click();
    const first = page.locator('.day-card').first();
    await expect(first.locator('.stat').first()).toContainText('89 km');
    await expect(first.locator('.stat').nth(1)).toContainText('1097 m');
    await expect(first.locator('.day-route')).toContainText('Bonar Bridge');
  });

  test('cards expand and collapse on tap', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL());
    const first = page.locator('.day-card').first();
    await expect(first).not.toHaveClass(/expanded/);
    await first.locator('.day-header').click();
    await expect(first).toHaveClass(/expanded/);
    await first.locator('.day-header').click();
    await expect(first).not.toHaveClass(/expanded/);
  });

  test('shops and accommodation land on the day named in their row', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL());
    const first = page.locator('.day-card').first();
    await first.locator('.day-header').click();
    await expect(first.locator('.item-name').filter({ hasText: 'Evanton Co-op' })).toBeVisible();
    await expect(first.locator('.item-name').filter({ hasText: 'Wild camp options' })).toBeVisible();
  });

  test('uses the label column and the ?label= parameter', async ({ page }) => {
    const tabs = DEFAULT_TABS();
    tabs.Days = tabs.Days.replace('day,title', 'day,label,title')
                         .replace(/^(\d+),/gm, '$1,Stage,');
    await mockSheet(page, { tabs });
    await page.goto(appURL('&label=Section'));
    // The row's own label wins over the URL parameter.
    await expect(page.locator('.day-title').first()).toContainText('Stage 1');
  });

  test('falls back to the ?label= parameter when no label column', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&label=Section'));
    await expect(page.locator('.day-title').first()).toContainText('Section 1');
  });

  test('escapes sheet content instead of rendering it as markup', async ({ page }) => {
    const tabs = DEFAULT_TABS();
    tabs.Days = tabs.Days.replace('Inverness → Bonar Bridge / Golspie',
      '"<img src=x onerror=window.__pwned=1> Inverness → Bonar"');
    await mockSheet(page, { tabs });
    await page.goto(appURL());
    await expect(page.locator('.day-route').first()).toContainText('<img src=x');
    expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
    await expect(page.locator('.day-route img')).toHaveCount(0);
  });
});

test.describe('failure states', () => {
  test('asks for a sheet ID when none is given', async ({ page }) => {
    await mockSheet(page);
    await page.goto('/index.html');
    await expect(page.locator('#days-container')).toContainText('No Sheet ID provided');
  });

  test('explains itself when every tab fails to load', async ({ page }) => {
    await mockSheet(page, { tabs: {} });
    await page.goto(appURL());
    await expect(page.locator('#days-container')).toContainText('Failed to load route data');
  });

  test('keeps rendering when a single tab fails', async ({ page }) => {
    const tabs = DEFAULT_TABS();
    delete tabs.Shops;
    await mockSheet(page, { tabs });
    await page.goto(appURL());
    await expect(page.locator('.day-card')).toHaveCount(8);
    await expect(page.locator('.banner.error')).toContainText('Shops');
  });

  test('an empty sheet says what to add rather than showing nothing', async ({ page }) => {
    await mockSheet(page, { tabs: {
      Days: 'day,title,rugged_end,rugged_distance,rugged_elevation,rolling_end,rolling_distance,rolling_elevation,surface\n',
      Shops: 'day,name,rugged,rolling,opens,location,details\n',
      Accommodation: 'day,name,rugged,rolling,details,location\n',
      Optional: 'field,value\n',
    } });
    await page.goto(appURL('&edit=1'));
    await expect(page.locator('#days-container')).toContainText('No rows in the Days tab yet');
    await expect(page.locator('.banner.warn')).toContainText('Days tab has no rows');
    await expect(page.locator('.banner.error')).toHaveCount(0);
  });

  test('a day with no surface value hides the tag outside edit mode', async ({ page }) => {
    const tabs = DEFAULT_TABS();
    tabs.Days = blankColumn(tabs.Days, 'surface');
    await mockSheet(page, { tabs });
    await page.goto(appURL());
    await page.locator('.day-card').first().locator('.day-header').click();
    await expect(page.locator('.surface-tag').first()).toBeHidden();
  });
});
