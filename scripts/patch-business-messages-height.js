/**
 * Messages panel: flex-1 min-h-0 so chat UI fills main column (not zero-height h-full).
 * Re-run after rebuilding the React bundle.
 */
const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

const replacements = [
  [
    'className:"flex h-full items-center justify-center text-gray-400"',
    'className:"flex flex-1 min-h-0 items-center justify-center text-gray-400"',
  ],
  [
    'className:"flex h-full items-center justify-center p-6"',
    'className:"flex flex-1 min-h-0 items-center justify-center p-6"',
  ],
  [
    'return a.jsxs("div",{className:"flex h-full",children:[a.jsxs("div",{className:"w-72 border-r border-gray-100 flex flex-col"',
    'return a.jsxs("div",{className:"flex flex-1 min-h-0 min-w-0",children:[a.jsxs("div",{className:"w-72 border-r border-gray-100 flex flex-col"',
  ],
];

let changed = 0;
for (const [from, to] of replacements) {
  if (!c.includes(from)) {
    if (c.includes(to)) continue;
    console.error("MISSING patch target:", from.slice(0, 80));
    process.exit(1);
  }
  c = c.split(from).join(to);
  changed++;
}

if (!changed) {
  console.log("Already patched — business messages height.");
  process.exit(0);
}

fs.writeFileSync(p, c);
console.log("Patched messages panel flex height (" + changed + " replacements).");
