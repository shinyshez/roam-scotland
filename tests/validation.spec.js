const { test, expect } = require('@playwright/test');
const { mockSheet, appURL, ready, DEFAULT_TABS, renameColumn } = require('./helpers');

test.describe('validation banner', () => {
  test('is silent on a healthy sheet', async ({ page }) => {
    await mockSheet(page);
    await page.goto(appURL('&edit=1'));
    await ready(page);
    await expect(page.locator('.day-card').first()).toBeVisible();
    await expect(page.locator('.banner')).toHaveCount(0);
  });

  test('reports a missing required column and suggests the real name', async ({ page }) => {
    const tabs = DEFAULT_TABS();
    tabs.Days = renameColumn(tabs.Days, 'rugged_distance', 'rugged_dist');
    await mockSheet(page, { tabs });
    await page.goto(appURL());
    const error = page.locator('.banner.error');
    await expect(error).toBeVisible();
    await expect(error).toContainText('Days tab is missing the required column rugged_distance');
    await page.locator('#edit-toggle').click();
    await expect(page.locator('.banner.warn')).toContainText('unrecognised column rugged_dist');
    await expect(page.locator('.banner.warn')).toContainText('Did you mean rugged_distance?');
  });

  test('flags a row pinned to a day that does not exist', async ({ page }) => {
    const tabs = DEFAULT_TABS();
    tabs.Shops = tabs.Shops.trimEnd() + '\n9,Ghost Cafe,1 km,1 km,TBC,,\n';
    await mockSheet(page, { tabs });
    await page.goto(appURL('&edit=1'));
    await expect(page.locator('.banner.warn'))
      .toContainText('Shops row 22 has day = 9, which is not in the Days tab');
  });

  test('flags a row with no day at all', async ({ page }) => {
    const tabs = DEFAULT_TABS();
    tabs.Shops = tabs.Shops.trimEnd() + '\n,Orphan Cafe,1 km,1 km,TBC,,\n';
    await mockSheet(page, { tabs });
    await page.goto(appURL('&edit=1'));
    await expect(page.locator('.banner.warn')).toContainText('has no day, so it is not shown anywhere');
  });

  test('flags an empty required value', async ({ page }) => {
    const tabs = DEFAULT_TABS();
    tabs.Days = tabs.Days.replace('1,Inverness → Bonar Bridge / Golspie,Golspie,121 km',
                                  '1,Inverness → Bonar Bridge / Golspie,,121 km');
    await mockSheet(page, { tabs });
    await page.goto(appURL('&edit=1'));
    await expect(page.locator('.banner.warn')).toContainText('Days row 1: rugged_end is empty but required');
  });

  test('flags duplicate day numbers', async ({ page }) => {
    const tabs = DEFAULT_TABS();
    tabs.Days = tabs.Days.trimEnd() + '\n1,Duplicate day,X,1 km,1 m,X,1 km,1 m,Road\n';
    await mockSheet(page, { tabs });
    await page.goto(appURL('&edit=1'));
    await expect(page.locator('.banner.warn')).toContainText('more than one row with day = 1');
  });

  test('flags an unrecognised key in the Optional tab', async ({ page }) => {
    const tabs = DEFAULT_TABS();
    tabs.Optional = 'field,value\nelevaton,1300 m\ntitle,Cape Wrath Spoke\n';
    await mockSheet(page, { tabs });
    await page.goto(appURL('&edit=1'));
    await expect(page.locator('.banner.warn')).toContainText('unrecognised field elevaton');
    await expect(page.locator('.banner.warn')).toContainText('Did you mean elevation?');
  });

  test('flags an unrecognised key in the Config tab', async ({ page }) => {
    const tabs = DEFAULT_TABS();
    tabs.Config = 'field,value\npage_titel,Typo Title\n';
    await mockSheet(page, { tabs });
    await page.goto(appURL('&edit=1'));
    await expect(page.locator('.banner.warn')).toContainText('unrecognised field page_titel');
    await expect(page.locator('.banner.warn')).toContainText('Did you mean page_title?');
  });

  test('an absent Config or Optional tab is not a problem', async ({ page }) => {
    const tabs = DEFAULT_TABS();
    delete tabs.Config;
    delete tabs.Optional;
    await mockSheet(page, { tabs });
    await page.goto(appURL('&edit=1'));
    await ready(page);
    await expect(page.locator('.day-card').first()).toBeVisible();
    await expect(page.locator('.banner')).toHaveCount(0);
  });

  test('accepts numbered shop and accommodation keys', async ({ page }) => {
    const tabs = DEFAULT_TABS();
    tabs.Optional = tabs.Optional.trimEnd() + '\nshop_2_name,Second Shop\nshop_2_opens,09:00\n';
    await mockSheet(page, { tabs });
    await page.goto(appURL('&edit=1'));
    await expect(page.locator('.banner.warn')).toHaveCount(0);
    await page.locator('#optional-card .day-header').click();
    await expect(page.locator('#optional-card')).toContainText('Second Shop');
  });

  test('a reader is shown no warnings at all', async ({ page }) => {
    const tabs = DEFAULT_TABS();
    tabs.Shops = tabs.Shops.trimEnd() + '\n9,Ghost Cafe,1 km,1 km,TBC,,\n';
    await mockSheet(page, { tabs });
    await page.goto(appURL());
    await ready(page);
    await expect(page.locator('.day-card').first()).toBeVisible();
    await expect(page.locator('.banner')).toHaveCount(0);
    // They are waiting in edit mode for whoever maintains the sheet.
    await page.locator('#edit-toggle').click();
    await expect(page.locator('.banner.warn')).toBeVisible();
    await expect(page.locator('.banner.warn')).toContainText('day = 9');
  });

  test('errors are shown to everyone, not just editors', async ({ page }) => {
    const tabs = DEFAULT_TABS();
    tabs.Days = renameColumn(tabs.Days, 'title', 'name');
    await mockSheet(page, { tabs });
    await page.goto(appURL());
    await expect(page.locator('.banner.error')).toBeVisible();
  });
});
