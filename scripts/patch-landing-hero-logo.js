const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

const startMarker =
  'a.jsx("div",{className:"flex justify-center lg:justify-end",children:a.jsxs("div",{className:"w-full max-w-sm bg-[#111116]';
const endMarker =
  ',a.jsx("section",{className:"bg-[#09090b] py-16 border-t border-white/5"';

const start = c.indexOf(startMarker);
const end = c.indexOf(endMarker, start);
if (start < 0 || end < 0) {
  console.error("markers not found", { start, end });
  process.exit(1);
}

const removed = c.slice(start, end);
const open = (removed.match(/\(/g) || []).length;
const close = (removed.match(/\)/g) || []).length;
const openB = (removed.match(/\[/g) || []).length;
const closeB = (removed.match(/\]/g) || []).length;
console.log("removed parens", open, close, "brackets", openB, closeB);
console.log("removed tail:", removed.slice(-150));

const imgBlock =
  'a.jsx("div",{className:"flex justify-center lg:justify-end items-center",children:a.jsx("div",{className:"relative w-full max-w-xl px-2 sm:px-4",children:a.jsx("img",{src:"/Asset/Influnet-LOGO/landing%20logo.png",alt:"Influnet — The Business Operating System for Influencers and Brands",className:"w-full h-auto object-contain drop-shadow-[0_20px_60px_rgba(124,58,237,0.25)]",loading:"eager",decoding:"async","data-testid":"hero-landing-logo"})})})';

// Restore the same closing tokens that were after the login card (grid + hero section).
const suffix = "])]})}),";
const newBlock = imgBlock + suffix;

c = c.slice(0, start) + newBlock + c.slice(end);
fs.writeFileSync(p, c);

try {
  new Function(c);
  console.log("patched landing logo — syntax OK");
} catch (e) {
  console.error("syntax error:", e.message);
  process.exit(1);
}
