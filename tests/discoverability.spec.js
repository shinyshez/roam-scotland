const { test, expect } = require('@playwright/test');
const { mockSheet, appURL, ready, SHEET_ID, DEFAULT_TABS, blankColumn } = require('./helpers');

// A sheet-driven value, addressed by the tab and column behind it.
const fld = (page, tab, col) => page.locator(`.fld[data-tab="${tab}"][data-col="${col}"]`);
const tip = page => page.locator('#fld-tip');

test.describe('field markers', () => {
  test('are inert until edit mode is turned on', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL());
    await ready(page);
    const value = fld(page, 'Days', 'rugged_distance').first();
    await expect(value).toHaveCSS('border-bottom-style', 'solid');
    await expect(value).toHaveCSS('border-bottom-width', '0px');
    // Hovering does nothing at all for a reader.
    await value.hover();
    await expect(tip(page)).toBeHidden();
  });

  test('become a quiet dotted underline in edit mode', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL());
    await ready(page);
    await page.locator('#edit-toggle').click();
    await expect(fld(page, 'Days', 'rugged_distance').first()).toHaveCSS('border-bottom-style', 'dotted');
  });

  test('?edit=1 starts in edit mode', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    await ready(page);
    await expect(page.locator('body')).toHaveClass(/edit-mode/);
    await expect(page.locator('.editbar')).toBeVisible();
  });

  test('cover the values on a day card', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    await ready(page);
    const first = page.locator('.day-card').first();
    await expect(first.locator('.stat').first().locator('.fld')).toHaveAttribute('data-col', 'rugged_distance');
    await expect(first.locator('.day-title .fld')).toHaveAttribute('data-col', 'day');
    await first.locator('.day-header').click();
    const shop = first.locator('.item').first();
    await expect(shop.locator('.item-name .fld')).toHaveAttribute('data-tab', 'Shops');
    await expect(shop.locator('.detail').filter({ hasText: 'Opening times' }).locator('.fld'))
      .toHaveAttribute('data-col', 'opens');
  });

  test('follow the selected route variant', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    await ready(page);
    await page.locator('#btn-rolling').click();
    await expect(page.locator('.day-card').first().locator('.stat').first().locator('.fld'))
      .toHaveAttribute('data-col', 'rolling_distance');
  });

  test('toggling edit mode updates the URL so the view is shareable', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL());
    await ready(page);
    await page.locator('#edit-toggle').click();
    await expect(page).toHaveURL(/edit=1/);
    await page.locator('#edit-toggle').click();
    await expect(page).not.toHaveURL(/edit=1/);
  });
});

test.describe('the field tooltip', () => {
  test('names the tab, column and cell on hover', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    await ready(page);
    // Days columns: day A, title B, rugged_end C, rugged_distance D.
    // Data row 1 sits on sheet row 2, under the header row.
    await page.locator('.day-card').first().locator('.stat').first().locator('.fld').hover();
    await expect(tip(page)).toBeVisible();
    await expect(tip(page)).toContainText('Days · rugged_distance');
    await expect(tip(page)).toContainText('cell D2');
  });

  test('opens on tap, for a phone with no hover', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    await ready(page);
    await page.locator('.day-card').first().locator('.day-title .fld').click();
    await expect(tip(page)).toBeVisible();
    await expect(tip(page)).toContainText('Days · day');
  });

  test('links to the exact tab and cell', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    await ready(page);
    await page.locator('.day-card').first().locator('.stat').first().locator('.fld').hover();
    await expect(tip(page).locator('a'))
      .toHaveAttribute('href', `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=0&range=D2`);
  });

  test('tracks the row a value actually sits on', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    await ready(page);
    // Day 4 is the fourth data row, so sheet row 5.
    await page.locator('.day-card').nth(3).locator('.day-title .fld').hover();
    await expect(tip(page)).toContainText('cell A5');
    await expect(tip(page).locator('a')).toHaveAttribute('href', /#gid=0&range=A5$/);
  });

  test('reaches the other tabs', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    await ready(page);
    const first = page.locator('.day-card').first();
    await first.locator('.day-header').click();
    // Shops columns: day A, name B. First shop row is sheet row 2.
    await first.locator('.item').first().locator('.item-name .fld').hover();
    await expect(tip(page).locator('a')).toHaveAttribute('href', /#gid=111&range=B2$/);
    // Config is key/value: page_title is its first row, value column B.
    await page.locator('#page-title .fld').hover();
    await expect(tip(page).locator('a')).toHaveAttribute('href', /#gid=444&range=B2$/);
    // Optional likewise.
    await page.locator('#optional-card .day-route .fld').hover();
    await expect(tip(page).locator('a')).toHaveAttribute('href', /#gid=333&range=B2$/);
  });

  test('falls back to the sheet front page when gids cannot be discovered', async ({ page }) => {
    await mockSheet(page, { gids: null });
    await page.goto(appURL('&edit=1'));
    await ready(page);
    await page.locator('.day-card').first().locator('.stat').first().locator('.fld').hover();
    // The cell is still named, even though the link cannot jump to it.
    await expect(tip(page)).toContainText('cell D2');
    await expect(tip(page).locator('a'))
      .toHaveAttribute('href', `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`);
  });

  test('closes on Escape and on a tap elsewhere', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    await ready(page);
    const value = page.locator('.day-card').first().locator('.day-title .fld');
    await value.click();
    await expect(tip(page)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(tip(page)).toBeHidden();

    await value.click();
    await expect(tip(page)).toBeVisible();
    await page.locator('.container').click({ position: { x: 5, y: 5 } });
    await expect(tip(page)).toBeHidden();
  });

  test('stays open while the pointer moves onto it, so the link is reachable', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    await ready(page);
    await page.locator('.day-card').first().locator('.stat').first().locator('.fld').hover();
    await expect(tip(page)).toBeVisible();
    await tip(page).hover();
    await expect(tip(page)).toBeVisible();
    await expect(tip(page).locator('a')).toBeVisible();
  });

  test('stays inside the viewport on a narrow screen', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 720 });
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    await ready(page);
    const first = page.locator('.day-card').first();
    await first.locator('.day-header').click();
    // A long value near the right edge is the awkward case.
    await first.locator('.item').first().locator('.detail').first().locator('.fld').hover();
    const box = await tip(page).boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(360);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(720);
  });

  test('follows the value when the page scrolls', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 640 });
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    await ready(page);
    const value = page.locator('.day-card').first().locator('.stat').first().locator('.fld');
    await value.hover();
    await expect(tip(page)).toBeVisible();
    const before = await tip(page).boundingBox();
    await page.mouse.wheel(0, 120);
    await expect(tip(page)).toBeVisible();
    const after = await tip(page).boundingBox();
    expect(after.y).toBeLessThan(before.y);
  });

  test('a re-render clears any open tooltip', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    await ready(page);
    await page.locator('.day-card').first().locator('.stat').first().locator('.fld').click();
    await expect(tip(page)).toBeVisible();
    await page.locator('#btn-rolling').click();
    await expect(tip(page)).toBeHidden();
  });
});

test.describe('the tooltip does not swallow the page', () => {
  test('tapping a value still expands its card', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    await ready(page);
    const first = page.locator('.day-card').first();
    await first.locator('.day-title .fld').click();
    await expect(first).toHaveClass(/expanded/);
    await expect(tip(page)).toBeVisible();
  });

  test('the route toggle still switches', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    await ready(page);
    await page.locator('#btn-rolling').click();
    await expect(page.locator('#btn-rolling')).toHaveClass(/active/);
    await expect(page.locator('.day-card').first().locator('.stat').first()).toContainText('89 km');
  });

  test('the hidden diagnostics panel still opens on five taps of the title', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    await ready(page);
    for (let i = 0; i < 5; i++) await page.locator('#page-title').click();
    await expect(page.locator('#debug-panel')).toBeVisible();
    await expect(page.locator('#debug-panel')).toContainText('Resolved SHEET_ID');
  });

  test('a GPS link is still a link, not nested inside another', async ({ page }) => {
    const tabs = DEFAULT_TABS();
    tabs.Days = tabs.Days.split('\n').map((l, i) =>
      i === 1 ? l.replace(/,,$/, ',https://example.com/day1.gpx,') : l).join('\n');
    await mockSheet(page, { tabs });
    await page.goto(appURL('&edit=1'));
    await ready(page);
    const first = page.locator('.day-card').first();
    await first.locator('.day-header').click();
    await expect(first.locator('a.gps-link')).toHaveAttribute('href', 'https://example.com/day1.gpx');
    await expect(first.locator('a.gps-link a')).toHaveCount(0);
    await first.locator('.fld[data-col="rugged_gps"]').hover();
    await expect(tip(page)).toContainText('Days · rugged_gps');
  });
});

test.describe('ghost placeholders', () => {
  test('name the tab and row to add when a day has no shops', async ({ page }) => {
    const tabs = DEFAULT_TABS();
    tabs.Shops = tabs.Shops.split('\n').filter(l => !l.startsWith('3,')).join('\n');
    await mockSheet(page, { tabs });
    await page.goto(appURL());
    await ready(page);
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
    await ready(page);
    await page.locator('.day-card').first().locator('.day-header').click();
    const tag = page.locator('.surface-tag').first();
    await expect(tag).toBeVisible();
    await expect(tag).toContainText('add surface');
  });

  test('the optional card is hidden when the Optional tab has no spoke', async ({ page }) => {
    const tabs = DEFAULT_TABS();
    tabs.Optional = 'field,value\n';
    await mockSheet(page, { tabs });
    await page.goto(appURL());
    await ready(page);
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

  test('show_route_toggle=false hides the route buttons and says which field did it', async ({ page }) => {
    const tabs = DEFAULT_TABS();
    tabs.Config = 'field,value\npage_title,One Route\nshow_route_toggle,false\n';
    await mockSheet(page, { tabs });
    await page.goto(appURL('&edit=1'));
    await ready(page);
    await expect(page.locator('#route-toggle')).toBeHidden();
    await expect(page.locator('#toggle-src .fld')).toHaveText('show_route_toggle');
  });

  test('names the fields behind the route buttons on their own line', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    await ready(page);
    const fields = page.locator('#toggle-src .fld');
    await expect(fields).toHaveCount(2);
    await expect(fields.first()).toHaveText('route_rugged_label');
    // Nothing is added inside the buttons, so a tap always switches route.
    await expect(page.locator('#btn-rolling .fld')).toHaveCount(0);
    await fields.first().hover();
    await expect(tip(page)).toContainText('Config · route_rugged_label');
  });
});

test.describe('edit toolbar and field reference', () => {
  test('shows when the data was loaded and links to the sheet', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    await ready(page);
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
    await ready(page);
    await page.locator('#btn-help').click();
    const panel = page.locator('#help-panel');
    await expect(panel).toBeVisible();
    for (const tab of ['Days tab', 'Shops tab', 'Accommodation tab', 'Config tab', 'Optional tab']) {
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
