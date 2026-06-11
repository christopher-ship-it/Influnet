/**
 * Business dashboard: wire Settings nav to profile editor mount.
 * Re-run after rebuilding the React bundle.
 */
const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

const oldStr =
  'case"saved":return a.jsx(EC,{setSection:r});default:return a.jsx(DC,{label:dd.find(R=>R.id===s)?.label??s})';
const newStr =
  'case"saved":return a.jsx(EC,{setSection:r});case"settings":return a.jsx("div",{className:"flex-1 overflow-y-auto min-h-0 bg-[#F5F6FA]",children:a.jsx("div",{id:"influnet-settings-mount",className:"w-full"})});default:return a.jsx(DC,{label:dd.find(R=>R.id===s)?.label??s})';

if (c.includes(newStr)) {
  console.log("Already patched — business settings mount.");
  process.exit(0);
}
if (!c.includes(oldStr)) {
  console.error("MISSING settings mount target.");
  process.exit(1);
}
c = c.replace(oldStr, newStr);
fs.writeFileSync(p, c);
console.log("Patched business dashboard settings mount.");
