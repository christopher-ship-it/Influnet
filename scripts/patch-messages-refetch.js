/**
 * Poll messages every 3s so other user's messages appear without refresh.
 */
const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

const from =
  "dj=(s,r)=>{const{query:i,request:c}=r??{};return{queryKey:i?.queryKey??Nd(s),queryFn:({signal:h})=>uj(s,{signal:h,...c}),enabled:!!s,...i}}";

const to =
  "dj=(s,r)=>{const{query:i,request:c}=r??{};return{queryKey:i?.queryKey??Nd(s),queryFn:({signal:h})=>uj(s,{signal:h,...c}),enabled:!!s,refetchInterval:3e3,refetchIntervalInBackground:!0,...i}}";

if (c.includes(to)) {
  console.log("Already patched — messages refetchInterval.");
  process.exit(0);
}
if (!c.includes(from)) {
  console.error("MISSING dj() — bundle may have changed.");
  process.exit(1);
}
c = c.replace(from, to);
fs.writeFileSync(p, c);
console.log("Patched messages query refetchInterval (3s).");
