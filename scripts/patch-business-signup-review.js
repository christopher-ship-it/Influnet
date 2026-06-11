/**
 * Business signup: pending review screen instead of auto-login → dashboard.
 * Re-run after rebuilding the React bundle.
 */
const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

const oldStr = 'r(Oe.user,Oe.token),s("/dashboard")';
const newStr =
  'if(Oe.pendingReview){localStorage.removeItem("influnet_token"),localStorage.removeItem("influnet_user"),localStorage.removeItem("influnet_refresh_token"),g(!1),window.location.replace("/signup/business?review=pending");return}r(Oe.user,Oe.token),s("/dashboard")';

const alreadyPatched =
  'window.location.replace("/signup/business?review=pending")';
if (!c.includes(oldStr)) {
  if (c.includes(alreadyPatched)) {
    console.log("Already patched — business signup review redirect.");
    process.exit(0);
  }
  if (c.includes("review=pending")) {
    c = c.replace(
      's("/signup/business?review=pending")',
      'window.location.replace("/signup/business?review=pending")'
    );
    fs.writeFileSync(p, c);
    console.log("Upgraded business signup patch to full-page redirect.");
    process.exit(0);
  }
  console.error("MISSING business signup redirect — bundle may have changed.");
  process.exit(1);
}

c = c.replace(oldStr, newStr);
fs.writeFileSync(p, c);
console.log("Patched business signup: pending review redirect.");
