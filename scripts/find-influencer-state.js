const fs = require("fs");
const s = fs.readFileSync("d:/influnet/influnet/assets/index-Bqfxp3sU.js", "utf8");
const i = s.indexOf('label:"State / Province"');
console.log(s.slice(i, i + 280));
const j = s.indexOf('label:"State",children');
console.log("---");
console.log(s.slice(j, j + 280));
