/**
 * Add "Other" to business type options + validate Other custom text in bundle.
 * Re-run after rebuilding the React bundle.
 */
const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

const patches = [
  [
    '"Freelancer / Solo"],oC=',
    '"Freelancer / Solo","Other"],oC=',
  ],
  [
    'if(i===2){if(!L)return"Please select a business type.";if(!ae)return"Please select an industry."}',
    'if(i===2){if(!L)return"Please select a business type.";if(L==="Other"&&!Kt.trim())return"Please specify your business type.";if(!ae)return"Please select an industry.";if(ae==="Other"&&!On.trim())return"Please specify your industry."}',
  ],
  [
    '[ae,se]=y.useState(""),[fe,z]=y.useState("")',
    '[ae,se]=y.useState(""),[Kt,fn]=y.useState(""),[On,Cn]=y.useState(""),[fe,z]=y.useState("")',
  ],
  [
    'value:L,onChange:te=>J(te.target.value),children:[a.jsx("option",{value:"",children:"Select type"}),iC.map(te=>a.jsx("option",{children:te},te))]})}),a.jsx(_t,{label:"Industry"',
    'value:L,onChange:te=>J(te.target.value),children:[a.jsx("option",{value:"",children:"Select type"}),iC.map(te=>a.jsx("option",{children:te},te))]})}),L==="Other"&&a.jsx(_t,{label:"Specify business type",children:a.jsx(Ne,{className:gt,placeholder:"Enter your business type",value:Kt,onChange:te=>fn(te.target.value)})}),a.jsx(_t,{label:"Industry"',
  ],
  [
    'value:ae,onChange:te=>se(te.target.value),children:[a.jsx("option",{value:"",children:"Select industry"}),oC.map(te=>a.jsx("option",{children:te},te))]})})]}),a.jsx(_t,{label:"Company Website"',
    'value:ae,onChange:te=>se(te.target.value),children:[a.jsx("option",{value:"",children:"Select industry"}),oC.map(te=>a.jsx("option",{children:te},te))]})}),ae==="Other"&&a.jsx(_t,{label:"Specify industry",children:a.jsx(Ne,{className:gt,placeholder:"Enter your industry",value:On,onChange:te=>Cn(te.target.value)})})]}),a.jsx(_t,{label:"Company Website"',
  ],
  [
    'industry:ae,gstNumber:ee',
    'industry:ae==="Other"?On.trim():ae,businessType:L==="Other"?Kt.trim():L,gstNumber:ee',
  ],
];

let applied = 0;
for (const [oldStr, newStr] of patches) {
  if (c.includes(newStr)) {
    applied++;
    continue;
  }
  if (!c.includes(oldStr)) {
    console.error("MISSING patch target:", oldStr.slice(0, 70) + "...");
    process.exit(1);
  }
  c = c.replace(oldStr, newStr);
  applied++;
}

fs.writeFileSync(p, c);
console.log(`Patched business type/industry Other (${applied} changes).`);
