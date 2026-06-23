const fs = require("fs");
const s = fs.readFileSync("d:/influnet/influnet/assets/index-Bqfxp3sU.js", "utf8");
const idx = s.indexOf("Ns=");
console.log(s.slice(idx, idx + 200));
const idx2 = s.indexOf("gt=");
console.log(s.slice(idx2, idx2 + 200));
