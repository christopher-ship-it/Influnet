/**
 * /influnet/:slug must not load the business dashboard (UC).
 * Use an empty shell; public-influencer-profile.js renders the page.
 */
const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

const old = 'a.jsx(zt,{path:"/influnet/:slug",component:UC})';
const neu =
  'a.jsx(zt,{path:"/influnet/:slug",component:function iC(){return null}})';

if (!c.includes(old)) {
  if (c.includes("path:\"/influnet/:slug\",component:function iC()")) {
    console.log("public profile route already patched");
    process.exit(0);
  }
  console.error("route pattern not found:", old.slice(0, 60));
  process.exit(1);
}

c = c.replace(old, neu);
fs.writeFileSync(p, c);
console.log("patched /influnet/:slug to empty shell (not business dashboard)");

