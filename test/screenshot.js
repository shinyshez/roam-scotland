/**
 * Playwright screenshot script with mocked Google Sheets data.
 * Usage: node test/screenshot.js
 *
 * Requires a local HTTP server: python3 -m http.server 8080
 * Outputs screenshots to /tmp/screenshot_*.png
 */
const { chromium } = require('playwright');

const MOCK_DATA = {
  Config: `"field","value"
"page_title","RSR Far North 2025"
"logo",""`,

  Days: `"day","title","rugged_end","rugged_distance","rugged_elevation","rolling_end","rolling_distance","rolling_elevation","surface","rugged_gps","rolling_gps"
"1","Inverness → Bonar Bridge / Golspie","Golspie","121 km","1566 m","Bonar Bridge","89 km","1097 m","Road → Gravel","https://example.com/day1_rugged.gpx","https://example.com/day1_rolling.gpx"
"2","Golspie → Helmsdale / Loch More","Loch More (via Forsinard)","94 km","1073 m","Helmsdale","75 km","943 m","Coastal track • Forest tracks • Moorland","","https://example.com/day2_rolling.gpx"
"3","Loch More / Helmsdale → Tongue","Tongue","120 km","1120 m","Tongue","105 km","1049 m","Moorland • Estate tracks • Coastal","","",
"4","Tongue → Lairg / Bonar Bridge","Bonar Bridge","130 km","1796 m","Lairg","90 km","1035 m","Road + rough tracks • River crossing (Cashel Dhu) on rugged line","","",
"5","Lairg / Bonar Bridge → Ullapool","Ullapool","92 km","957 m","Ullapool","58 km","626 m","Long mixed gravel • Rough 5–6 km section (Lochan Diamh)","","",
"6","Ullapool → Evanton / Glen Glass","Glen Glass / Evanton","92 km","1350 m","Evanton","90 km","1100 m","~100 km continuous gravel • Long estate tracks","","",
"7","Evanton / Glen Glass → Inverness","Inverness","88 km","1145 m","Inverness","39 km","364 m","Road → Forestry → Firthside","","",`,

  Shops: `"day","name","rugged","rolling","opens","location","details"
"1","Evanton Co-op","10 km","10 km","TBC","",""
"1","Ardgay Stores","58 km","58 km","TBC","",""
"1","Spar Bonar Bridge","off-route (+~6 km)","89 km","TBC","",""
"2","Golspie (village)","0 km","0 km","TBC","",""
"2","Brora (coastal detour)","off-route (+~15 km)","~12 km","TBC","",""
"2","Forsinard Tearoom","~52 km","off-route (+~7 km)","TBC","",""
"2","Helmsdale shops","off-route (+~10–20 km)","75 km","TBC","",""
"3","Garvault House (lunch)","~38 km","~30 km","TBC","",""
"3","Bettyhill shop & bistro","~80 km","~75 km","TBC","",""
"3","Small croft shops / roadside kiosks","","","TBC / seasonal","scattered",""
"4","Crask Inn (roadside)","~55 km","~40 km","TBC, check seasonal hours","",""
"4","Invercassley Tearoom / small shop","~95 km","~68 km","TBC / limited hours","",""
"4","Local pubs (various)","","","TBC","Lairg / Bonar approaches",""
"5","Small roadside shops (limited)","variable","0–30 km","TBC","",""
"5","Ullapool supermarket & cafés","","","","","Large supermarket; opens TBC"
"6","Aultguish Inn (off-route)","~35–45 km","off-route","TBC","",""
"6","Small roadside cafés","","","TBC","scattered",""
"6","Evanton / Alness shops & cafés","~92 km","~90 km","TBC","",""
"7","Highland Farm Café","~25 km","~12 km","10:00? — TBC","",""
"7","Contin shop","~30 km","~18 km","TBC","",""
"7","Conon Hotel / White Cottage Café","","","TBC","last 10–20 km",""`,

  Accommodation: `"day","name","rugged","rolling","details","location"
"1","Wild camping (various)","40–60 km","40–60 km","River spots near Carbisdale","Shin valley"
"1","Golspie campsite / hostel","121 km","off-route","End of rugged day","Golspie"
"1","Bonar Bridge B&Bs","off-route (+~6 km)","89 km","End of rolling day","Bonar Bridge"
"2","Wild camping","40–60 km","40–60 km","Moorland spots","Various"
"2","Helmsdale hostel / B&B","off-route","75 km","End of rolling day","Helmsdale"
"3","Wild camping (moorland)","50–70 km","50–70 km","Remote spots","Various"
"3","Tongue hostel / campsite","120 km","105 km","End of day","Tongue"
"4","Wild camping","50–70 km","50–70 km","River spots","Various"
"4","Lairg B&Bs","off-route","90 km","End of rolling day","Lairg"
"5","Wild camping","30–50 km","30–50 km","Loch-side spots","Various"
"5","Ullapool hostels / campsite","92 km","58 km","End of day","Ullapool"
"6","Wild camping","40–60 km","40–60 km","Estate tracks","Various"
"6","Evanton B&B","92 km","90 km","End of day","Evanton"
"7","N/A — finish in Inverness","88 km","39 km","End of tour","Inverness"`,

  Optional: `"field","value"
"title","Cape Wrath Spoke"
"distance","~96 km"
"elevation","~1300 m"
"warning","Ferry coordination + MoD range access check required"
"access","Rugged line variant or separate spoke; detours may be +10–40 km depending on ferry and approach"
"shop_1_name","Ozone Café at Cape Wrath lighthouse"
"shop_1_opens","Seasonal — TBC"
"accommodation_1_name","Kearvaig Bothy, local bothies"
"accommodation_1_details","Distances variable, details TBC"`
};

const BASE_URL = 'http://localhost:8080/index.html?sheet=MOCK';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } });

  // Intercept Google Sheets requests and return mock data
  await page.route('**/docs.google.com/spreadsheets/**', (route) => {
    const url = route.request().url();
    const sheetMatch = url.match(/sheet=([^&]+)/);
    const sheetName = sheetMatch ? decodeURIComponent(sheetMatch[1]) : '';
    console.log('Intercepted:', sheetName);

    if (MOCK_DATA[sheetName]) {
      route.fulfill({ status: 200, contentType: 'text/csv', body: MOCK_DATA[sheetName] });
    } else {
      route.fulfill({ status: 200, contentType: 'text/csv', body: '' });
    }
  });

  await page.goto(BASE_URL);

  // Capture splash screen before it fades
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/screenshot_splash.png', fullPage: true });
  console.log('Saved /tmp/screenshot_splash.png');

  // Wait for splash to dismiss and main content to appear
  await page.waitForTimeout(3000);

  // Collapsed view
  await page.screenshot({ path: '/tmp/screenshot_collapsed.png', fullPage: true });
  console.log('Saved /tmp/screenshot_collapsed.png');

  // Expand Day 1
  const firstCard = await page.$('.day-card .day-header');
  if (firstCard) {
    await firstCard.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/screenshot_expanded.png', fullPage: true });
    console.log('Saved /tmp/screenshot_expanded.png');
  }

  // Toggle to Rolling (only if toggle is visible)
  const rollingBtn = await page.$('[data-route="rolling"]');
  if (rollingBtn && await rollingBtn.isVisible()) {
    await rollingBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/screenshot_rolling.png', fullPage: true });
    console.log('Saved /tmp/screenshot_rolling.png');
  } else {
    console.log('Route toggle hidden, skipping rolling screenshot');
  }

  await browser.close();
  console.log('Done');
})();
