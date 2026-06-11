/**
 * Show custom type/industry fields only when "Other" is selected.
 * Re-run after rebuilding the React bundle.
 */
const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

const patches = [
  [
    'if(i===2){if(!L&&!Kt.trim())return"Please select or enter a business type.";if(L==="Other"&&!Kt.trim())return"Please enter your business type.";if(!ae&&!On.trim())return"Please select or enter an industry.";if(ae==="Other"&&!On.trim())return"Please enter your industry."}',
    'if(i===2){if(!L)return"Please select a business type.";if(L==="Other"&&!Kt.trim())return"Please enter your business type.";if(!ae)return"Please select an industry.";if(ae==="Other"&&!On.trim())return"Please enter your industry."}',
  ],
  [
    'a.jsx(_t,{label:"Or type your own",optional:!0,children:a.jsx(Ne,{className:gt,placeholder:"Enter your business type",value:Kt,onChange:te=>fn(te.target.value)})}),a.jsx(_t,{label:"Industry"',
    'L==="Other"&&a.jsx(_t,{label:"Specify business type",children:a.jsx(Ne,{className:gt,placeholder:"Enter your business type",value:Kt,onChange:te=>fn(te.target.value)})}),a.jsx(_t,{label:"Industry"',
  ],
  [
    'a.jsx(_t,{label:"Or type your own",optional:!0,children:a.jsx(Ne,{className:gt,placeholder:"Enter your industry",value:On,onChange:te=>Cn(te.target.value)})})]}),a.jsx(_t,{label:"Company Website"',
    'ae==="Other"&&a.jsx(_t,{label:"Specify industry",children:a.jsx(Ne,{className:gt,placeholder:"Enter your industry",value:On,onChange:te=>Cn(te.target.value)})})]}),a.jsx(_t,{label:"Company Website"',
  ],
  [
    "industry:On.trim()||(ae===\"Other\"?\"\":ae),businessType:Kt.trim()||(L===\"Other\"?\"\":L)",
    'industry:ae==="Other"?On.trim():ae,businessType:L==="Other"?Kt.trim():L',
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
console.log(`Patched Other-only custom fields (${applied} changes).`);
