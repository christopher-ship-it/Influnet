/**
 * Business dashboard home: remove Quick Actions sidebar card.
 * Re-run after rebuilding the React bundle.
 */
const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

const vCDef =
  'const vC=[{Icon:za,label:"Search Influencers"},{Icon:un,label:"Send Collaboration Request"},{Icon:rl,label:"View Shortlists"},{Icon:an,label:"Upgrade Plan"}];';

const quickActionsBlock =
  ',a.jsxs("div",{className:"bg-white rounded-2xl shadow-sm border border-gray-100 p-5",children:[a.jsx("h2",{className:"text-base font-bold text-gray-900 mb-4",children:"Quick Actions"}),a.jsx("div",{className:"space-y-2.5",children:vC.map(({Icon:x,label:m})=>a.jsxs("button",{className:"flex items-center gap-3 w-full text-left hover:text-violet-600 transition-colors",onClick:()=>{m==="Search Influencers"?s("discover"):m==="Send Collaboration Request"?s("requests"):m==="View Shortlists"&&s("saved")},children:[a.jsx(x,{className:"size-4 text-gray-400 shrink-0"}),a.jsx("span",{className:"text-sm text-gray-700",children:m})]},m))})]})';

if (!c.includes(quickActionsBlock) && !c.includes(vCDef)) {
  console.log("Already patched — Quick Actions removed.");
  process.exit(0);
}

if (!c.includes(quickActionsBlock)) {
  console.error("MISSING Quick Actions block.");
  process.exit(1);
}

c = c.replace(quickActionsBlock, "");
if (c.includes(vCDef)) {
  c = c.replace(vCDef, "");
}

fs.writeFileSync(p, c);
console.log("Removed Quick Actions from business dashboard.");
