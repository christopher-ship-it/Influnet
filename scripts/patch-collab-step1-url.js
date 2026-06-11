const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

const oldStr = 'imgLabel:"Smart Search",imgSub:"Filtering Creators"';
const newStr = 'imgLabel:"influnet.com/tim",imgSub:""';

if (!c.includes(oldStr)) {
  if (c.includes(newStr)) {
    console.log("collab step1 URL already patched");
    process.exit(0);
  }
  console.error("pattern not found:", oldStr);
  process.exit(1);
}

c = c.replace(oldStr, newStr);
fs.writeFileSync(p, c);
console.log("patched Discover Creators card URL");
