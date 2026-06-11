/**
 * Messages header: show Active now / Last seen / Typing instead of only industry/niche.
 * Re-run after rebuilding the React bundle.
 */
const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

const oldAc =
  'function AC(s){const r=s.otherUser;return r.companyName?r.industry??"":r.niche?.join(", ")??""}';

const newAc =
  'function AC(s){const r=s.otherUser;if(r.isTyping)return"Typing…";if(r.isOnline)return"Active now";if(r.lastSeenAt){const t=Date.now()-new Date(r.lastSeenAt).getTime();if(t<9e4)return"Active now";const m=Math.floor(t/6e4);if(m<60)return"Last seen "+m+"m ago";const h=Math.floor(m/60);if(h<24)return"Last seen "+h+"h ago";return"Last seen "+Math.floor(h/24)+"d ago"}return r.companyName?r.industry??"":r.niche?.join(", ")??""}';

if (c.includes(newAc)) {
  console.log("Already patched — messages presence AC().");
  process.exit(0);
}

if (!c.includes(oldAc)) {
  console.error("MISSING AC() — bundle may have changed.");
  process.exit(1);
}

c = c.replace(oldAc, newAc);
fs.writeFileSync(p, c);
console.log("Patched AC() for last seen / typing subtitle.");
