const fs = require("fs");
const s = fs.readFileSync("d:/influnet/influnet/assets/index-Bqfxp3sU.js", "utf8");
const i = s.indexOf("Upgrade Plan");
console.log(s.slice(i - 900, i + 600));
