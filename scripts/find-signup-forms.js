const fs = require("fs");
const s = fs.readFileSync("d:/influnet/influnet/assets/index-Bqfxp3sU.js", "utf8");
const rC = s.indexOf("function rC(");
const mC = s.indexOf("function mC(");
const nextFn = (start) => {
  const end = s.indexOf("function ", start + 20);
  return s.slice(start, end);
};
console.log("rC has influencer", nextFn(rC).includes("influencer"));
console.log("rC has business", nextFn(rC).includes("business"));
console.log("mC has influencer", nextFn(mC).includes("influencer"));
console.log("mC has business", nextFn(mC).includes("business"));
console.log("rC City", nextFn(rC).includes("City"));
console.log("mC City", nextFn(mC).includes("City"));
