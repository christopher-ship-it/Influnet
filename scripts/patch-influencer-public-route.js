const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");
const old =
  'a.jsx(zt,{path:"/dashboard",component:UC}),a.jsx(zt,{path:"/dashboard/influencer",component:a8}),a.jsx(zt,{component:JS})';
const neu =
  'a.jsx(zt,{path:"/dashboard",component:UC}),a.jsx(zt,{path:"/dashboard/influencer",component:a8}),a.jsx(zt,{path:"/influnet/:slug",component:function iC(){return null}}),a.jsx(zt,{component:JS})';
if (!c.includes(old)) {
  console.error("route pattern not found");
  process.exit(1);
}
c = c.replace(old, neu);

const mountOld =
  'a.jsx("div",{id:"influnet-influencer-account-mount",className:"space-y-6"})]})}const md=';
const mountNew =
  'a.jsx("div",{id:"influnet-profile-link-mount",className:"space-y-6"}),a.jsx("div",{id:"influnet-influencer-account-mount",className:"space-y-6"})]})}const md=';
if (c.includes(mountOld)) {
  c = c.replace(mountOld, mountNew);
  console.log("added profile link mount");
} else if (!c.includes("influnet-profile-link-mount")) {
  console.warn("profile link mount pattern not found");
}

fs.writeFileSync(p, c);
console.log("patched public influencer routes");
