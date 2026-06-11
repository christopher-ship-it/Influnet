/**
 * Persist all business signup fields (social, address) on register.
 */
const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

const oldStr =
  'marketingBudget:wr==="Other"?Xt.trim():wr||void 0});if(Oe.pendingReview)';
const newStr =
  'marketingBudget:wr==="Other"?Xt.trim():wr||void 0,instagramHandle:Y.trim()||void 0,facebookHandle:he.trim()||void 0,linkedinHandle:F.trim()||void 0,registeredAddress:Ae.trim()||void 0,city:xe.trim()||void 0,state:ze.trim()||void 0});if(Oe.pendingReview)';

if (c.includes("registeredAddress:Ae")) {
  console.log("Already patched — register extra fields.");
  process.exit(0);
}
if (!c.includes(oldStr)) {
  console.error("MISSING register payload target.");
  process.exit(1);
}
c = c.replace(oldStr, newStr);
fs.writeFileSync(p, c);
console.log("Patched business register extra fields.");
