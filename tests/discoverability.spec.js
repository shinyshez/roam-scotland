const { test, expect } = require('@playwright/test');
const { mockSheet, appURL, ready, SHEET_ID, DEFAULT_TABS, blankColumn } = require('./helpers');

test.describe('source badges', () => {
  test('are hidden until edit mode is turned on', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL());
    await expect(page.locator('.src').first()).toBeHidden();
    await page.locator('#edit-toggle').click();
    await expect(page.locator('.src').first()).toBeVisible();
  });

  test('?edit=1 starts in edit mode', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    await expect(page.locator('body')).toHaveClass(/edit-mode/);
    await expect(page.locator('.editbar')).toBeVisible();
  });

  test('name the tab and column behind each value', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    const first = page.locator('.day-card').first();
    await expect(first.locator('.stat').first().locator('.src')).toHaveText('Days · rugged_distance');
    await expect(first.locator('.stat').nth(1).locator('.src')).toHaveText('Days · rugged_elevation');
    await expect(first.locator('.day-title .src')).toHaveText('Days · day');
  });

  test('follow the selected route variant', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    await page.locator('#btn-rolling').click();
    const first = page.locator('.day-card').first();
    await expect(first.locator('.stat').first().locator('.src')).toHaveText('Days · rolling_distance');
  });

  test('appear on shop and accommodation lines too', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    const first = page.locator('.day-card').first();
    await first.locator('.day-header').click();
    const shop = first.locator('.item').first();
    await expect(shop.locator('.item-name .src')).toHaveText('Shops · name');
    await expect(shop.locator('.detail').filter({ hasText: 'Opening times' }).locator('.src')).toHaveText('Shops · opens');
  });

  test('the edit toggle does not cover the title badge', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    await ready(page);
    await expect(page.locator('#page-title .src')).toHaveText('Config · page_title');
    const badge = await page.locator('#page-title .src').boundingBox();
    const toggle = await page.locator('#edit-toggle').boundingBox();
    const overlaps = badge.x < toggle.x + toggle.width && toggle.x < badge.x + badge.width &&
                     badge.y < toggle.y + toggle.height && toggle.y < badge.y + badge.height;
    expect(overlaps).toBe(false);
  });

  test('toggling edit mode updates the URL so the view is shareable', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL());
    await page.locator('#edit-toggle').click();
    await expect(page).toHaveURL(/edit=1/);
    await page.locator('#edit-toggle').click();
    await expect(page).not.toHaveURL(/edit=1/);
  });
});

test.describe('deep links into the sheet', () => {
  test('point at the exact tab and cell', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    const first = page.locator('.day-card').first();
    // Days columns: day A, title B, rugged_end C, rugged_distance D.
    // Data row 1 sits on sheet row 2, under the header row.
    await expect(first.locator('.stat').first().locator('.src'))
      .toHaveAttribute('href', `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=0&range=D2`);
    await expect(first.locator('.day-title .src'))
      .toHaveAttribute('href', new RegExp('#gid=0&range=A2$'));
  });

  test('use the right gid and row for other tabs', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    const first = page.locator('.day-card').first();
    await first.locator('.day-header').click();
    // Shops columns: day A, name B. First shop row is sheet row 2.
    await expect(first.locator('.item').first().locator('.item-name .src'))
      .toHaveAttribute('href', /#gid=111&range=B2$/);
    // Optional is key/value: the value column is B, and title is its first row.
    await expect(page.locator('#optional-card .day-route .src'))
      .toHaveAttribute('href', /#gid=333&range=B2$/);
  });

  test('reach the Config tab as well', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    await ready(page);
    // Config is key/value: page_title is its first row, value column B.
    await expect(page.locator('#page-title .src')).toHaveAttribute('href', /#gid=444&range=B2$/);
  });

  test('track the row a value actually sits on', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    // Day 4 is the fourth data row, so sheet row 5.
    await expect(page.locator('.day-card').nth(3).locator('.day-title .src'))
      .toHaveAttribute('href', /#gid=0&range=A5$/);
  });

  test('fall back to the sheet front page when gids cannot be discovered', async ({ page }) => {
    await mockSheet(page, { gids: null });
    await page.goto(appURL('&edit=1'));
    await expect(page.locator('.day-card').first().locator('.stat').first().locator('.src'))
      .toHaveAttribute('href', `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`);
  });

  test('opening a badge does not expand the card', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    const first = page.locator('.day-card').first();
    const popup = page.waitForEvent('popup');
    await first.locator('.stat').first().locator('.src').click();
    await (await popup).close();
    await expect(first).not.toHaveClass(/expanded/);
  });
});

test.describe('ghost placeholders', () => {
  test('name the tab and row to add when a day has no shops', async ({ page }) => {
    const tabs = DEFAULT_TABS();
    tabs.Shops = tabs.Shops.split('\n').filter(l => !l.startsWith('3,')).join('\n');
    await mockSheet(page, { tabs });
    await page.goto(appURL());
    const day3 = page.locator('.day-card').nth(2);
    await day3.locator('.day-header').click();
    await expect(day3.locator('.ghost-note').first()).toBeHidden();
    await page.locator('#edit-toggle').click();
    await page.locator('.day-card').nth(2).locator('.day-header').click();
    await expect(page.locator('.day-card').nth(2).locator('.ghost-note').first())
      .toContainText('Add a row to the Shops tab with day = 3');
  });

  test('prompt for an empty field in place', async ({ page }) => {
    const tabs = DEFAULT_TABS();
    tabs.Days = blankColumn(tabs.Days, 'surface');
    await mockSheet(page, { tabs });
    await page.goto(appURL('&edit=1'));
    await page.locator('.day-card').first().locator('.day-header').click();
    const tag = page.locator('.surface-tag').first();
    await expect(tag).toBeVisible();
    await expect(tag).toContainText('add surface');
  });

  test('the optional card is hidden when the Optional tab has no spoke', async ({ page }) => {
    const tabs = DEFAULT_TABS();
    tabs.Optional = 'field,value\npage_title,Roam Scotland\n';
    await mockSheet(page, { tabs });
    await page.goto(appURL());
    await expect(page.locator('#optional-card')).toHaveCount(0);
    await expect(page.locator('.day-card')).toHaveCount(7);
    await page.locator('#edit-toggle').click();
    await expect(page.locator('#optional-ghost')).toContainText('No optional spoke card');
  });
});

test.describe('settings driven from the sheet', () => {
  test('title, subtitle and route button labels come from the Config tab', async ({ page }) => {
    const tabs = DEFAULT_TABS();
    tabs.Config = 'field,value\n' +
      'page_title,Roam Scotland — West\n' +
      'page_subtitle,Five days on the west coast\n' +
      'route_rugged_label,Hard\n' +
      'route_rolling_label,Easy\n';
    await mockSheet(page, { tabs });
    await page.goto(appURL());
    await ready(page);
    await expect(page.locator('#page-title')).toContainText('Roam Scotland — West');
    await expect(page.locator('#page-subtitle')).toBeVisible();
    await expect(page.locator('#page-subtitle')).toContainText('Five days on the west coast');
    await expect(page.locator('#btn-rugged')).toHaveText('Hard');
    await expect(page.locator('#btn-rolling')).toHaveText('Easy');
    await expect(page).toHaveTitle('Roam Scotland — West');
  });

  test('keeps the built-in labels when the sheet does not set them', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL());
    await ready(page);
    await expect(page.locator('#btn-rugged')).toContainText('Rugged');
    await expect(page.locator('#page-subtitle')).toBeHidden();
  });

  test('survives the Config tab not existing at all', async ({ page }) => {
    const tabs = DEFAULT_TABS();
    delete tabs.Config;
    await mockSheet(page, { tabs });
    await page.goto(appURL('&edit=1'));
    await ready(page);
    await expect(page.locator('.day-card').first()).toBeVisible();
    await expect(page.locator('.banner.error')).toHaveCount(0);
    await expect(page.locator('#page-title')).toContainText('RSR Far North 2025');
  });

  test('show_route_toggle=false hides the route buttons', async ({ page }) => {
    const tabs = DEFAULT_TABS();
    tabs.Config = 'field,value\npage_title,One Route\nshow_route_toggle,false\n';
    await mockSheet(page, { tabs });
    await page.goto(appURL('&edit=1'));
    await ready(page);
    await expect(page.locator('#route-toggle')).toBeHidden();
    // Edit mode still says which field hid them.
    await expect(page.locator('#toggle-src .src')).toHaveText('Config · show_route_toggle');
  });

  test('names the fields behind the route buttons without blocking them', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    await ready(page);
    const badges = page.locator('#toggle-src .src');
    await expect(badges).toHaveCount(2);
    await expect(badges.first()).toHaveText('Config · route_rugged_label');
    // The buttons themselves carry no badge, so a tap always switches route.
    await expect(page.locator('#btn-rolling .src')).toHaveCount(0);
    await page.locator('#btn-rolling').click();
    await expect(page.locator('#btn-rolling')).toHaveClass(/active/);
  });
});

test.describe('edit toolbar and field reference', () => {
  test('shows when the data was loaded and links to the sheet', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    await expect(page.locator('#loaded-at')).toContainText('Data loaded at');
    await expect(page.locator('#btn-open-sheet'))
      .toHaveAttribute('href', `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`);
  });

  test('reload re-fetches the sheet', async ({ page }) => {
    let hits = 0;
    await mockSheet(page);
    await page.context().route(/gviz/, route => { hits++; route.fallback(); });
    await page.goto(appURL('&edit=1'));
    await ready(page);
    await expect(page.locator('.day-card').first()).toBeVisible();
    const before = hits;
    await page.locator('#btn-refresh').click();
    await expect.poll(() => hits).toBeGreaterThan(before);
  });

  test('the field reference lists every tab, column and what it drives', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    await page.locator('#btn-help').click();
    const panel = page.locator('#help-panel');
    await expect(panel).toBeVisible();
    for (const tab of ['Days tab', 'Shops tab', 'Accommodation tab', 'Optional tab']) {
      await expect(panel).toContainText(tab);
    }
    await expect(panel).toContainText('rugged_distance');
    await expect(panel).toContainText('Distance stat while Rugged is selected.');
    await expect(panel).toContainText('page_subtitle');
    await expect(panel).toContainText('Set in the code, not the sheet');
    await page.locator('#help-close').click();
    await expect(panel).toBeHidden();
  });
});
