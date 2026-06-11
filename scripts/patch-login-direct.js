const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");
const old =
  'async function V(){m(""),N(!0);try{const Z=await fetch("/api/auth/send-otp",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:d.trim(),password:h})}),L=await Z.json();if(!Z.ok)throw new Error(L.error||"Failed to send verification code");E(["","","","","",""]),_(""),S("otp"),setTimeout(()=>G.current[0]?.focus(),50)}catch(Z){m(Z.message||"Failed to send verification code.")}finally{N(!1)}}';
const neu =
  'async function V(){m(""),N(!0);try{const Z=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:d.trim(),password:h})}),L=await Z.json();if(!Z.ok)throw new Error(L.error||"Login failed");r(L.user,L.token);const _n=new URLSearchParams(window.location.search).get("next");s(_n&&_n.startsWith("/")&&!_n.startsWith("//")?_n:L.user.role==="influencer"?"/dashboard/influencer":"/dashboard")}catch(Z){m(Z.message||"Login failed.")}finally{N(!1)}}';
if (!c.includes(old)) {
  console.error("login pattern not found");
  process.exit(1);
}
c = c.replace(old, neu);
fs.writeFileSync(p, c);
console.log("patched login to skip OTP");
