/**
 * Influencer dashboard: notify home overlay when React section changes.
 * Re-run after rebuilding the React bundle.
 */
const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

const hook = "window.influnetOnInfluencerSectionChange?.(R);";

if (c.includes(hook)) {
  console.log("Already patched — influencer section hook.");
  process.exit(0);
}

const replacements = [
  [
    'J=s===R,ae=R==="messages"?w:R==="requests"?S:0;return a.jsxs("button",{onClick:()=>r(R)',
    `J=s===R,ae=R==="messages"?w:R==="requests"?S:0;return a.jsxs("button",{onClick:()=>{${hook}r(R)}`,
  ],
  [
    "children:zp.map(({id:R,Icon:Z,label:L})=>a.jsxs(\"button\",{onClick:()=>r(R)",
    `children:zp.map(({id:R,Icon:Z,label:L})=>a.jsxs("button",{onClick:()=>{${hook}r(R)}`,
  ],
];

let n = 0;
for (const [from, to] of replacements) {
  if (!c.includes(from)) {
    console.error("MISSING:", from.slice(0, 100));
    process.exit(1);
  }
  c = c.replace(from, to);
  n++;
}

fs.writeFileSync(p, c);
console.log("Patched influencer section hook (" + n + " changes).");
