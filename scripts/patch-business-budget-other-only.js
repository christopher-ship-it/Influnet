/**
 * Monthly budget: one dropdown; custom amount field only when "Other" is selected.
 * Re-run after rebuilding the React bundle.
 */
const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

const patches = [
  [
    '"₹10L+"],uC=',
    '"₹10L+","Other"],uC=',
  ],
  [
    'label:"Monthly Marketing Budget",children:a.jsxs("div",{className:"space-y-2",children:[a.jsxs("select",{className:`${gt} w-full rounded-md border border-white/10 px-3 appearance-none`,value:wr,onChange:te=>Sr(te.target.value),children:[a.jsx("option",{value:"",children:"Select a range…"}),cC.map(te=>a.jsx("option",{children:te},te))]}),a.jsx(Ne,{type:"text",inputMode:"decimal",className:gt,placeholder:"Or type your budget amount (e.g. ₹50,000 / month)",value:Xt,onChange:te=>bl(te.target.value)})]})',
    'label:"Monthly Marketing Budget",children:a.jsxs("div",{className:"space-y-2",children:[a.jsxs("select",{className:`${gt} w-full rounded-md border border-white/10 px-3 appearance-none`,value:wr,onChange:te=>Sr(te.target.value),children:[a.jsx("option",{value:"",children:"Select a range…"}),cC.map(te=>a.jsx("option",{children:te},te))]}),wr==="Other"&&a.jsx(Ne,{type:"text",inputMode:"decimal",className:gt,placeholder:"Enter your budget amount (e.g. ₹50,000 / month)",value:Xt,onChange:te=>bl(te.target.value)})]})',
  ],
  [
    "marketingBudget:Xt.trim()||wr||void 0",
    'marketingBudget:wr==="Other"?Xt.trim():wr||void 0',
  ],
  [
    'if(!Ae.trim())return"Registered address is required."}return""}const[N,w]',
    'if(!Ae.trim())return"Registered address is required."}if(i===4){if(wr==="Other"&&!Xt.trim())return"Please enter your budget amount."}return""}const[N,w]',
  ],
];

let applied = 0;
for (const [oldStr, newStr] of patches) {
  if (c.includes(newStr)) {
    applied++;
    continue;
  }
  if (!c.includes(oldStr)) {
    console.error("MISSING:", oldStr.slice(0, 90) + "...");
    process.exit(1);
  }
  c = c.replace(oldStr, newStr);
  applied++;
}

fs.writeFileSync(p, c);
console.log(`Patched budget Other-only field (${applied} changes).`);
