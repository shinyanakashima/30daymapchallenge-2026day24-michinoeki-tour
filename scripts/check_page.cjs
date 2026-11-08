// Load the page in Chromium, fail on console errors or HTTP errors, and save
// docs/screenshot.png (1200x900, whole route).
// usage: node scripts/check_page.cjs [url]   (default: serves ./web on :8123)
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const path = require("path");

(async () => {
  let server = null;
  let base = process.argv[2];
  if (!base) {
    server = spawn("python3", ["-m", "http.server", "8123", "-d", path.join(__dirname, "..", "web")], { stdio: "ignore" });
    await new Promise((r) => setTimeout(r, 1000));
    base = "http://localhost:8123/";
  }
  const browser = await chromium.launch();
  const problems = [];
  const check = async (page, label) => {
    page.on("console", (m) => { if (m.type() === "error") problems.push(`${label} console: ${m.text()}`); });
    page.on("pageerror", (e) => problems.push(`${label} pageerror: ${e.message}`));
    page.on("response", (r) => { if (r.status() >= 400) problems.push(`${label} HTTP ${r.status()} ${r.url()}`); });
    page.on("requestfailed", (r) => problems.push(`${label} failed ${r.url()} ${r.failure() && r.failure().errorText}`));
  };

  // Desktop screenshot of the whole route (no autoplay).
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await check(page, "desktop");
  await page.goto(base + "?still", { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelectorAll(".num").length > 100);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(__dirname, "..", "docs", "screenshot.png") });
  console.log("headline:", await page.textContent("#headline"));
  console.log("stats:", (await page.textContent("#stats dl")).replace(/\s+/g, " ").trim());

  // Interactions: click a station, play, switch language and start point.
  await page.click("#play");
  await page.waitForTimeout(3000);
  console.log("player:", (await page.textContent(".day-line")).trim());
  await page.click("#play");
  await page.click('#lang button[data-lang="ja"]');
  await page.selectOption("#start", "2");
  console.log("ja headline:", await page.textContent("#headline"));
  const hit = await page.evaluate(() => {
    const f = window.__map.queryRenderedFeatures({ layers: ["stations"] })[0];
    return f ? window.__map.project(f.geometry.coordinates) : null;
  });
  if (hit) {
    await page.mouse.click(hit.x, hit.y);
    await page.waitForSelector(".pop", { timeout: 3000 });
    console.log("popup:", (await page.textContent(".pop")).replace(/\s+/g, " ").trim());
  } else problems.push("no station rendered");
  await page.click("#about-btn");
  await page.waitForTimeout(300);
  await page.keyboard.press("Escape");

  // Phone, reduced motion: must not autoplay.
  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  const p2 = await phone.newPage();
  await check(p2, "phone");
  await p2.goto(base, { waitUntil: "networkidle" });
  await p2.waitForTimeout(3000);
  const playing = await p2.evaluate(() => document.getElementById("play").classList.contains("playing"));
  if (playing) problems.push("phone: autoplay with reduced motion");
  await p2.screenshot({ path: process.env.PHONE_SHOT || "/tmp/phone.png" });

  await browser.close();
  if (server) server.kill();
  if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
  console.log("OK: no console errors, no failed requests");
})();
