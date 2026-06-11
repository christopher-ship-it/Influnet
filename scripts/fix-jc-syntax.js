const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

const broken =
  ',a.jsx("div",{id:"influnet-dashboard-pipeline-row-mount",className:"w-full"})]}),a.jsx("div",{id:"influnet-dashboard-footer-mount",className:"w-full"})]})}';
const fixed =
  ',a.jsx("div",{id:"influnet-dashboard-pipeline-row-mount",className:"w-full"}),a.jsx("div",{id:"influnet-dashboard-footer-mount",className:"w-full"})]})}';

if (!c.includes(broken)) {
  if (c.includes(fixed)) {
    console.log("jC already fixed");
    process.exit(0);
  }
  console.error("Broken jC pattern not found");
  process.exit(1);
}

c = c.replace(broken, fixed);
fs.writeFileSync(p, c);
console.log("Fixed jC syntax");
