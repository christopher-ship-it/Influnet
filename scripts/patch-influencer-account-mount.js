const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");
const old =
  '" Save Changes"]})})})]})}const md=[{id:"home",Icon:uf,label:"Dashboard"';
const neu =
  '" Save Changes"]})})}),a.jsx("div",{id:"influnet-influencer-account-mount",className:"space-y-6"})]})}const md=[{id:"home",Icon:uf,label:"Dashboard"';
if (!c.includes(old)) {
  console.error("mount pattern not found");
  process.exit(1);
}
c = c.replace(old, neu);
const hintOld =
  "Name can be changed from account settings.";
const hintNew =
  "Update your email and password in Account settings below.";
if (c.includes(hintOld)) c = c.replace(hintOld, hintNew);
fs.writeFileSync(p, c);
console.log("patched influencer profile mount");
