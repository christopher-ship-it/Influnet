const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

const oldStr = 'const gl="/app/assets/influnet-logo-BB9OG6CE.png"';
const newStr = 'const gl="/Asset/Influnet-LOGO/Logo.png"';

if (!c.includes(oldStr)) {
  if (c.includes(newStr)) {
    console.log("header logo already patched");
    process.exit(0);
  }
  console.error("pattern not found:", oldStr);
  process.exit(1);
}

c = c.replace(oldStr, newStr);

const oldCls = 'alt:"Influnet",className:"h-8 w-auto"';
const newCls = 'alt:"Influnet",className:"h-9 w-auto"';
if (c.includes(oldCls)) {
  c = c.replace(oldCls, newCls);
}

fs.writeFileSync(p, c);
console.log("patched header logo");
