/**
 * Influencer dashboard home: replace bundled $C home with injection mount.
 * Re-run after rebuilding the React bundle.
 */
const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

const old =
  'case"home":return a.jsx($C,{setSection:r})';
const neu =
  'case"home":return a.jsx("div",{id:"influnet-influencer-dashboard-mount",className:"w-full"})';

if (c.includes("influnet-influencer-dashboard-mount")) {
  console.log("Already patched — influencer dashboard mount.");
  process.exit(0);
}

if (!c.includes(old)) {
  console.error("MISSING home case for influencer dashboard");
  process.exit(1);
}

c = c.replace(old, neu);
fs.writeFileSync(p, c);
console.log("Patched influencer dashboard home mount.");
