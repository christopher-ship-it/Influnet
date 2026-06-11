const { execSync } = require("child_process");
const path = require("path");
const root = path.join(__dirname, "..");
const patches = [
  "patch-login-next.js",
  "patch-login-direct.js",
  "patch-influencer-account-mount.js",
  "patch-influencer-public-route.js",
  "patch-landing-hero.js",
  "patch-landing-hero-colors.js",
];

for (const p of patches) {
  console.log("\n>>", p);
  try {
    execSync(`node "${path.join(__dirname, p)}"`, { stdio: "inherit", cwd: root });
  } catch (e) {
    console.error("FAILED:", p);
    process.exit(1);
  }
}
execSync(`node "${path.join(__dirname, "fix-bundle-syntax.js")}"`, { stdio: "inherit" });
