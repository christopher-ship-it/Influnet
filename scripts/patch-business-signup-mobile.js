/**
 * Remove business signup step-1 mobile requirement until SMS/OTP is deployed.
 * Re-run after rebuilding the React bundle if signup validation returns.
 */
const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

const oldStr = 'if(!q.trim())return"Mobile number is required."';
const newStr = "/* mobile optional until OTP deploy */";

if (!c.includes(oldStr)) {
  if (c.includes("/* mobile optional until OTP deploy */")) {
    console.log("Already patched — mobile validation removed.");
    process.exit(0);
  }
  console.error("MISSING mobile validation string — bundle may have changed.");
  process.exit(1);
}

c = c.replace(oldStr, newStr);
fs.writeFileSync(p, c);
console.log("Patched business signup: mobile no longer required on step 1.");
