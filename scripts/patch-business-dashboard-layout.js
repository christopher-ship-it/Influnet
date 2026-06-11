/**
 * Remove horizontal stat cards from dashboard home (moved to right sidebar).
 * Re-run after rebuilding the React bundle.
 */
const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

const statsGrid =
  ',a.jsx("div",{className:"grid grid-cols-4 gap-4",children:g.map(({label:x,value:m,sub:b,Icon:N,color:w})=>a.jsx("div",{className:"bg-white rounded-2xl p-5 shadow-sm border border-gray-100",children:a.jsxs("div",{className:"flex items-start justify-between",children:[a.jsxs("div",{children:[a.jsx("p",{className:"text-xs text-gray-400 font-medium mb-1",children:x}),a.jsx("p",{className:"text-3xl font-black text-gray-900",children:m}),a.jsx("p",{className:"text-xs text-gray-400 mt-1",children:b})]}),a.jsx("div",{className:"size-9 rounded-xl bg-gray-50 flex items-center justify-center",children:a.jsx(N,{className:`size-5 ${w}`})})]})},x))})';

if (!c.includes(statsGrid)) {
  console.log("Already patched — stat cards row removed.");
  process.exit(0);
}

c = c.replace(statsGrid, "");
fs.writeFileSync(p, c);
console.log("Removed horizontal stat cards from dashboard home.");
