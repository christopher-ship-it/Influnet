const fs = require("fs");
const s = fs.readFileSync("d:/influnet/influnet/assets/index-Bqfxp3sU.js", "utf8");
const gl = s.match(/const gl="[^"]+"/);
console.log(gl?.[0]);
const idx = s.indexOf("flex h-screen");
console.log(s.slice(idx, idx + 800));
