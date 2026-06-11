/**
 * Business + influencer dashboards: min-h-0 on main flex chain for Messages tab.
 */
const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

const replacements = [
  [
    'className:"flex-1 flex flex-col min-w-0 overflow-hidden"',
    'className:"flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden"',
  ],
  [
    'className:`flex-1 overflow-y-auto ${s==="messages"?"overflow-hidden flex flex-col":""}`',
    'className:`flex-1 min-h-0 overflow-hidden flex flex-col ${s==="messages"?"":"overflow-y-auto"}`',
  ],
  [
    'case"messages":return a.jsx(oy,{onProjectCreated:()=>r("projects")})',
    'case"messages":return a.jsx("div",{className:"influnet-react-messages-root flex flex-1 min-h-0 min-w-0 w-full",children:a.jsx(oy,{onProjectCreated:()=>r("projects")})})',
  ],
];

let n = 0;
for (const [from, to] of replacements) {
  if (c.includes(to)) continue;
  if (!c.includes(from)) {
    console.error("MISSING:", from.slice(0, 90));
    process.exit(1);
  }
  c = c.split(from).join(to);
  n++;
}

if (!n) {
  console.log("Already patched — messages shell.");
  process.exit(0);
}

fs.writeFileSync(p, c);
console.log("Patched messages shell (" + n + " changes).");
