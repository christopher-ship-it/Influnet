const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

// Manual patch had one extra `})` before the messages scroll div
const broken = "AC(q)})]})})]})]}),a.jsxs(\"div\",{ref:G";
const fixed = "AC(q)})]})]})]}),a.jsxs(\"div\",{ref:G";

if (c.includes(broken)) {
  c = c.replace(broken, fixed);
  fs.writeFileSync(p, c);
  console.log("applied bracket fix");
} else if (c.includes(fixed)) {
  console.log("already fixed");
} else {
  const idx = c.indexOf("ref:G");
  console.log("pattern not found; context:", c.slice(idx - 120, idx + 80));
}

try {
  new Function(c);
  console.log("syntax OK");
} catch (e) {
  console.log("still broken:", e.message);
  // locate error by trimming from end
  let lo = 0,
    hi = c.length;
  while (lo < hi - 1) {
    const mid = Math.floor((lo + hi) / 2);
    try {
      new Function(c.slice(0, mid));
      lo = mid;
    } catch {
      hi = mid;
    }
  }
  console.log("error near char", hi, c.slice(Math.max(0, hi - 150), hi + 150));
}
