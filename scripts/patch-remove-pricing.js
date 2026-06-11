const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

const replacements = [
  [
    '{label:"How It Works",href:"/how-it-works"},{label:"Pricing",href:"/pricing"}',
    '{label:"How It Works",href:"/how-it-works"}',
  ],
  [
    '{label:"For Influencers",href:"/influencers"},{label:"Pricing",href:"/pricing"},{label:"How It Works",href:"/how-it-works"}',
    '{label:"For Influencers",href:"/influencers"},{label:"How It Works",href:"/how-it-works"}',
  ],
];

let ok = 0;
for (const [oldStr, newStr] of replacements) {
  if (!c.includes(oldStr)) {
    if (!oldStr.includes("Pricing") || !c.includes('href:"/pricing"')) {
      console.log("skip (already removed?):", oldStr.slice(0, 50));
      ok++;
      continue;
    }
    console.error("MISSING:", oldStr);
    process.exit(1);
  }
  c = c.replace(oldStr, newStr);
  ok++;
}

fs.writeFileSync(p, c);
console.log("removed pricing nav links (" + ok + " replacements)");
