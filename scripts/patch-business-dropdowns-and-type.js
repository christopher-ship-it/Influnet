/**
 * Business signup: dropdowns + optional custom text (type, industry, budget).
 * Re-run after rebuilding the React bundle.
 */
const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

const patches = [
  [
    'if(i===2){if(!L)return"Please select a business type.";if(L==="Other"&&!Kt.trim())return"Please specify your business type.";if(!ae)return"Please select an industry.";if(ae==="Other"&&!On.trim())return"Please specify your industry."}',
    'if(i===2){if(!L&&!Kt.trim())return"Please select or enter a business type.";if(L==="Other"&&!Kt.trim())return"Please enter your business type.";if(!ae&&!On.trim())return"Please select or enter an industry.";if(ae==="Other"&&!On.trim())return"Please enter your industry."}',
  ],
  [
    'L==="Other"&&a.jsx(_t,{label:"Specify business type",children:a.jsx(Ne,{className:gt,placeholder:"Enter your business type",value:Kt,onChange:te=>fn(te.target.value)})}),a.jsx(_t,{label:"Industry"',
    'a.jsx(_t,{label:"Or type your own",optional:!0,children:a.jsx(Ne,{className:gt,placeholder:"Enter your business type",value:Kt,onChange:te=>fn(te.target.value)})}),a.jsx(_t,{label:"Industry"',
  ],
  [
    'ae==="Other"&&a.jsx(_t,{label:"Specify industry",children:a.jsx(Ne,{className:gt,placeholder:"Enter your industry",value:On,onChange:te=>Cn(te.target.value)})})]}),a.jsx(_t,{label:"Company Website"',
    'a.jsx(_t,{label:"Or type your own",optional:!0,children:a.jsx(Ne,{className:gt,placeholder:"Enter your industry",value:On,onChange:te=>Cn(te.target.value)})})]}),a.jsx(_t,{label:"Company Website"',
  ],
  [
    'industry:ae==="Other"?On.trim():ae,businessType:L==="Other"?Kt.trim():L',
    'industry:On.trim()||(ae==="Other"?"":ae),businessType:Kt.trim()||(L==="Other"?"":L)',
  ],
  [
    '[Xt,bl]=y.useState(""),[mn,jt]=y.useState(["influencers"])',
    '[Xt,bl]=y.useState(""),[wr,Sr]=y.useState(""),[mn,jt]=y.useState(["influencers"])',
  ],
  [
    'label:"Monthly Marketing Budget",children:a.jsx(Ne,{type:"text",inputMode:"decimal",className:gt,placeholder:"e.g. ₹50,000 / month",value:Xt,onChange:te=>bl(te.target.value)})',
    'label:"Monthly Marketing Budget",children:a.jsxs("div",{className:"space-y-2",children:[a.jsxs("select",{className:`${gt} w-full rounded-md border border-white/10 px-3 appearance-none`,value:wr,onChange:te=>Sr(te.target.value),children:[a.jsx("option",{value:"",children:"Select a range…"}),cC.map(te=>a.jsx("option",{children:te},te))]}),a.jsx(Ne,{type:"text",inputMode:"decimal",className:gt,placeholder:"Or type your budget amount (e.g. ₹50,000 / month)",value:Xt,onChange:te=>bl(te.target.value)})]})',
  ],
  [
    "marketingBudget:Xt.trim()||void 0",
    "marketingBudget:Xt.trim()||wr||void 0",
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
console.log(`Patched dropdowns + custom text (${applied} changes).`);
