/**
 * Influencer dashboard: rename Projects nav + page title to Collaborations.
 * Re-run after rebuilding the React bundle.
 */
const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

const patches = [
  [
    '{id:"projects",Icon:df,label:"Projects"},{id:"analytics",Icon:ml,label:"Analytics"}',
    '{id:"projects",Icon:df,label:"Collaborations"},{id:"analytics",Icon:ml,label:"Analytics"}',
  ],
  [
    'className:"text-2xl font-bold text-gray-900",children:"Projects"}),a.jsx("p",{className:"text-sm text-gray-500 mt-0',
    'className:"text-2xl font-bold text-gray-900",children:"Collaborations"}),a.jsx("p",{className:"text-sm text-gray-500 mt-0',
  ],
];

let changed = 0;
for (const [old, rep] of patches) {
  if (!c.includes(old)) {
    if (c.includes(rep)) {
      console.log("Already:", rep.slice(0, 60));
      continue;
    }
    console.error("MISSING:", old.slice(0, 80));
    process.exit(1);
  }
  c = c.replace(old, rep);
  changed++;
}

if (!changed) {
  console.log("Already patched — influencer Collaborations nav.");
  process.exit(0);
}

fs.writeFileSync(p, c);
console.log("Patched influencer Projects → Collaborations (" + changed + ").");
