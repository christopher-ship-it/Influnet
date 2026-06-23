const fs = require("fs");
const { pathToFileURL } = require("url");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
const c = fs.readFileSync(p, "utf8");

const idx = c.indexOf("ref:G");
console.log("ref:G context:\n", c.slice(idx - 200, idx + 120));

// dynamic import reports line/col for module syntax errors
import(pathToFileURL(p).href)
  .then(() => console.log("import OK"))
  .catch((e) => console.log("import error:", e.message));
