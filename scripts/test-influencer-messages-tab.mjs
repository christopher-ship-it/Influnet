/**
 * E2E smoke test: influencer Dashboard -> Messages tab opens without Edit Profile detour.
 * Run: node scripts/test-influencer-messages-tab.mjs
 */
import { chromium } from "playwright";
import { createServer } from "http";
import { readFileSync, existsSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const REPO = join(__dirname, "..");
const SITE = join(REPO, "influnet");

const MIME = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function startStaticServer(port) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let path = (req.url || "/").split("?")[0];
      const candidates = [
        join(REPO, path.replace(/^\//, "").replace(/\.\./g, "")),
        join(SITE, path.replace(/^\//, "").replace(/\.\./g, "")),
      ];
      const file = candidates.find((f) => f.startsWith(REPO) && existsSync(f));
      if (!file) {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(readFileSync(join(SITE, "index.html")));
        return;
      }
      const ext = extname(file);
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(readFileSync(file));
    });
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

async function runHarness(page) {
  console.log("1. HARNESS: Dashboard -> Messages (panel visibility logic)...");
  await page.goto("http://127.0.0.1:5099/scripts/test-influencer-messages-harness.html", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(() => typeof window.influnetOnInfluencerSectionChange === "function");

  await page.locator("aside nav button", { hasText: "Messages" }).click();
  await page.waitForSelector(".influnet-react-messages-root", { timeout: 5000 });

  let state = await page.evaluate(() => ({
    mountDisplay: document.getElementById("influnet-influencer-dashboard-mount")
      ? getComputedStyle(document.getElementById("influnet-influencer-dashboard-mount")).display
      : "gone",
    rootVisible:
      !!document.querySelector(".influnet-react-messages-root") &&
      getComputedStyle(document.querySelector(".influnet-react-messages-root")).display !== "none",
    bodyClass: document.body.classList.contains("infl-influencer-messages-view"),
    header: document.getElementById("crumb")?.textContent?.trim(),
  }));

  console.log("   ", JSON.stringify(state));

  const failed = [];
  if (!state.rootVisible) failed.push("messages root not visible");
  if (state.mountDisplay !== "none" && state.mountDisplay !== "gone") {
    failed.push(`home mount still visible (${state.mountDisplay})`);
  }
  if (!state.bodyClass) failed.push("missing infl-influencer-messages-view body class");
  if (state.header !== "Messages") failed.push(`header is "${state.header}"`);

  console.log("1b. HARNESS: switch back to Dashboard...");
  await page.locator("aside nav button", { hasText: "Dashboard" }).click();
  await page.waitForTimeout(400);
  state = await page.evaluate(() => {
    const mount = document.getElementById("influnet-influencer-dashboard-mount");
    const dash = document.querySelector("[data-infl-dashboard]");
    return {
      header: document.getElementById("crumb")?.textContent?.trim(),
      mountVisible:
        !!mount && getComputedStyle(mount).display !== "none" && mount.offsetHeight > 0,
      dashVisible:
        !!dash && getComputedStyle(dash).display !== "none" && dash.offsetHeight > 0,
      messagesBodyClass: document.body.classList.contains("infl-influencer-messages-view"),
    };
  });
  console.log("   ", JSON.stringify(state));
  if (state.header !== "Dashboard") failed.push(`after return header is "${state.header}"`);
  if (!state.mountVisible) failed.push("dashboard mount not visible after return");
  if (!state.dashVisible) failed.push("dashboard content not visible after return");
  if (state.messagesBodyClass) failed.push("messages body class still set on dashboard");
  return failed;
}

async function verifyBundleHook() {
  console.log("2. BUNDLE: React section hook patched...");
  const bundle = readFileSync(join(SITE, "assets/index-Bqfxp3sU.js"), "utf8");
  if (!bundle.includes("influnetOnInfluencerSectionChange")) {
    return ["bundle missing influnetOnInfluencerSectionChange hook"];
  }
  return [];
}

async function run() {
  const port = 5099;
  const server = await startStaticServer(port);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  const bundleFailed = await verifyBundleHook();
  const harnessFailed = await runHarness(page);

  await browser.close();
  server.close();

  const allFailed = [...bundleFailed, ...harnessFailed];
  if (errors.length) {
    console.log("Page errors:", errors);
    allFailed.push(...errors.filter((e) => e.includes("removeChild")));
  }

  if (allFailed.length) {
    console.error("\nFAILED:");
    allFailed.forEach((f) => console.error(" -", f));
    process.exit(1);
  }

  console.log("\nPASSED: Harness + bundle hook verified.");
  console.log(
    "Note: Full logged-in test needs deploy + influencer login (Supabase /api/auth/me requires a real session)."
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
