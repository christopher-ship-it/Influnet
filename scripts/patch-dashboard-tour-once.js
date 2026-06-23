/**
 * Dashboard Quick tour: show once per user after auth id is known.
 * Re-run after rebuilding the React bundle.
 */
const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

const oldStr =
  ",[P,V]=y.useState(()=>!ly(x?.id));async function q(){f(!1),await m(),h(\"/login\")}y.useEffect(()=>{function R(Z){g.current&&!g.current.contains(Z.target)&&f(!1)}return document.addEventListener(\"mousedown\",R),()=>document.removeEventListener(\"mousedown\",R)},[]);";

const newStr =
  ",[P,V]=y.useState(!1);y.useEffect(()=>{if(!x?.id){V(!1);return}V(!ly(x.id))},[x?.id]);async function q(){f(!1),await m(),h(\"/login\")}y.useEffect(()=>{function R(Z){g.current&&!g.current.contains(Z.target)&&f(!1)}return document.addEventListener(\"mousedown\",R),()=>document.removeEventListener(\"mousedown\",R)},[]);";

if (!c.includes(oldStr)) {
  if (c.includes(newStr)) {
    console.log("Already applied: dashboard tour once-only patch");
    process.exit(0);
  }
  console.error("MISSING patch target for dashboard tour");
  process.exit(1);
}

const count = c.split(oldStr).length - 1;
if (count !== 2) {
  console.error(`Expected 2 occurrences, found ${count}`);
  process.exit(1);
}

c = c.replaceAll(oldStr, newStr);
fs.writeFileSync(p, c);
console.log("Applied: dashboard tour once-only (business + influencer)");
