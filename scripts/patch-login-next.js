const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");
const old =
  'r(ae.user,ae.token),s(ae.user.role==="influencer"?"/dashboard/influencer":"/dashboard")';
const neu =
  'r(ae.user,ae.token);const _n=new URLSearchParams(window.location.search).get("next");s(_n&&_n.startsWith("/")&&!_n.startsWith("//")?_n:ae.user.role==="influencer"?"/dashboard/influencer":"/dashboard")';
if (!c.includes(old)) {
  console.error("pattern not found");
  process.exit(1);
}
c = c.replace(old, neu);
fs.writeFileSync(p, c);
console.log("patched login redirect");
