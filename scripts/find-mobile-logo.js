const fs = require("fs");
const s = fs.readFileSync("d:/influnet/influnet/assets/index-Bqfxp3sU.js", "utf8");
let i = 0;
let n = 0;
while (n < 20) {
  i = s.indexOf("src:gl", i + 1);
  if (i < 0) break;
  console.log(n, s.slice(i - 100, i + 150));
  n++;
}
