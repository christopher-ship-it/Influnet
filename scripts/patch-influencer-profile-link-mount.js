const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

if (c.includes("influnet-profile-link-mount")) {
  console.log("profile link mount already present");
  process.exit(0);
}

const old =
  'a.jsx("div",{id:"influnet-influencer-account-mount",className:"space-y-6"})]})}const md=';
const neu =
  'a.jsx("div",{id:"influnet-profile-link-mount",className:"space-y-6"}),a.jsx("div",{id:"influnet-influencer-account-mount",className:"space-y-6"})]})}const md=';

if (!c.includes(old)) {
  console.error("account mount anchor not found");
  process.exit(1);
}

c = c.replace(old, neu);
fs.writeFileSync(p, c);
console.log("added influnet-profile-link-mount");

