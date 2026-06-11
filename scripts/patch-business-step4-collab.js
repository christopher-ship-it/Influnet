/**
 * Step 4: influencers only + typed monthly budget (not dropdown).
 * Re-run after rebuilding the React bundle.
 */
const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

const patches = [
  [
    'uC=[{id:"influencers",label:"Influencers",sub:"Reach & Awareness"},{id:"ugc",label:"UGC Creators",sub:"Authentic Content"},{id:"ambassadors",label:"Brand Ambassadors",sub:"Long-term Partners"},{id:"agencies",label:"Agencies",sub:"Managed Solutions"}]',
    'uC=[{id:"influencers",label:"Influencers",sub:"Reach & Awareness"}]',
  ],
  [
    "[mn,jt]=y.useState([])",
    '[mn,jt]=y.useState(["influencers"])',
  ],
  [
    'label:"Monthly Marketing Budget Range",children:a.jsxs("select",{className:`${gt} w-full rounded-md border border-white/10 px-3 appearance-none`,value:Xt,onChange:te=>bl(te.target.value),children:[a.jsx("option",{value:"",children:"Select a range..."}),cC.map(te=>a.jsx("option",{children:te},te))]})',
    'label:"Monthly Marketing Budget",children:a.jsx(Ne,{type:"text",inputMode:"decimal",className:gt,placeholder:"e.g. ₹50,000 / month",value:Xt,onChange:te=>bl(te.target.value)})',
  ],
  [
    'children:["Looking For ",a.jsx("span",{className:"text-gray-700 font-normal normal-case ml-1",children:"Select all that apply"})]',
    'children:"Looking For"',
  ],
  [
    "collabPreferences:mn});if(Oe.pendingReview)",
    'collabPreferences:mn,marketingBudget:Xt.trim()||void 0});if(Oe.pendingReview)',
  ],
];

let applied = 0;
for (const [oldStr, newStr] of patches) {
  if (c.includes(newStr)) {
    applied++;
    continue;
  }
  if (!c.includes(oldStr)) {
    console.error("MISSING:", oldStr.slice(0, 80) + "...");
    process.exit(1);
  }
  c = c.replace(oldStr, newStr);
  applied++;
}

fs.writeFileSync(p, c);
console.log(`Patched step 4 collab (${applied} changes).`);
