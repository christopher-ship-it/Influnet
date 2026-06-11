/**
 * Dashboard home: React-stable mount points + grid layout for sidebar/footer.
 * Re-run after rebuilding the React bundle.
 */
const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

if (c.includes("influnet-dashboard-hero-mount")) {
  console.log("Already patched — dashboard mounts.");
  process.exit(0);
}

if (!c.includes("Welcome, ")) {
  console.error("MISSING Welcome block — unexpected jC shape");
  process.exit(1);
}

const fnStart = c.indexOf("function jC(");
const fnEnd = c.indexOf("}const NC=", fnStart);
if (fnStart < 0 || fnEnd < 0) {
  console.error("MISSING function jC");
  process.exit(1);
}

const fnBody = c.slice(fnStart, fnEnd);
const retMarker = 'return a.jsxs("div",{className:"p-6 space-y-6",children:[';
const retIdx = fnBody.indexOf(retMarker);
const welcomeIdx = fnBody.indexOf(
  'a.jsxs("div",{children:[a.jsxs("h1",{className:"text-2xl font-bold text-gray-900",children:["Welcome, ",i," 👋"]})',
  retIdx
);
const convIdx = fnBody.indexOf(
  ',a.jsxs("div",{className:"grid grid-cols-3 gap-4",children:[a.jsxs("div",{className:"col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5",children:[',
  retIdx
);
const convEndMarker = "},x.id)})})";
const convEnd = fnBody.lastIndexOf(convEndMarker);

if (retIdx < 0 || welcomeIdx < 0 || convIdx < 0 || convEnd < 0) {
  console.error("MISSING jC markers", { retIdx, welcomeIdx, convIdx, convEnd });
  process.exit(1);
}

const recOpen = fnBody.indexOf('a.jsxs("div",{children:[a.jsxs("div",{className:"flex items-center justify-between mb-3"', welcomeIdx);
if (recOpen < 0) {
  console.error("MISSING recommended section");
  process.exit(1);
}
const recommendedBlock = fnBody.slice(recOpen, convIdx);
let convBlock = fnBody.slice(convIdx, convEnd + convEndMarker.length);
convBlock = convBlock.replace(
  ',a.jsxs("div",{className:"grid grid-cols-3 gap-4",children:[a.jsxs("div",{className:"col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-5",children:[',
  ',a.jsxs("div",{className:"bg-white rounded-2xl shadow-sm border border-gray-100 p-5",children:['
);

const tail =
  "]}))]}),a.jsx(\"div\",{id:\"influnet-dashboard-sidebar-mount\",className:\"w-full xl:sticky xl:top-4\"})]}),a.jsx(\"div\",{id:\"influnet-dashboard-footer-mount\",className:\"w-full\"})]})";

const newFnBody =
  fnBody.slice(0, welcomeIdx) +
  'a.jsx("div",{id:"influnet-dashboard-hero-mount",className:"w-full"}),' +
  'a.jsxs("div",{className:"grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start",children:[a.jsxs("div",{className:"space-y-6 min-w-0",children:[' +
  recommendedBlock +
  convBlock +
  tail;

c = c.slice(0, fnStart) + newFnBody + c.slice(fnEnd);
fs.writeFileSync(p, c);
console.log("Patched dashboard home mounts.");
