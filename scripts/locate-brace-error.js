const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
const c = fs.readFileSync(p, "utf8");

// Find line 10 start/end
let line = 1;
let line10Start = 0;
let line10End = c.length;
for (let i = 0; i < c.length; i++) {
  if (line === 10 && line10Start === 0 && i > 0) line10Start = i;
  if (c[i] === "\n") {
    if (line === 10) {
      line10End = i;
      break;
    }
    line++;
  }
}
console.log("line 10 length:", line10End - line10Start);

// Binary search for minimal prefix that fails
let lo = 0;
let hi = c.length;
while (lo < hi - 1) {
  const mid = Math.floor((lo + hi) / 2);
  try {
    new Function(c.slice(0, mid));
    lo = mid;
  } catch {
    hi = mid;
  }
}
console.log("error at char", hi);
console.log("context:\n", c.slice(Math.max(0, hi - 200), hi + 200));

// Search for the messages patch area
const idx = c.indexOf('})]})]}),a.jsxs("div",{ref:G');
console.log("\npatched pattern at", idx);
if (idx >= 0) console.log(c.slice(idx - 300, idx + 400));

const idx2 = c.indexOf('})]}),a.jsxs("div",{ref:G');
console.log("\nunpatched pattern at", idx2);
