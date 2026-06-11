/**
 * Dashboard home: remove Top Picks + conversations, add pipeline mount, rename nav.
 * Re-run after rebuilding the React bundle (after patch-business-dashboard-mounts.js).
 */
const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

let changed = 0;

const navPatches = [
  ['{id:"projects",Icon:df,label:"Projects"}', '{id:"projects",Icon:df,label:"Collaborations"}'],
  ['{id:"saved",Icon:nn,label:"Saved Profiles"}', '{id:"saved",Icon:nn,label:"Saved Creators"}'],
  ['{id:"subscription",Icon:lf,label:"Subscription"}', '{id:"subscription",Icon:lf,label:"Invoices"}'],
];

for (const [old, rep] of navPatches) {
  if (c.includes(old)) {
    c = c.replace(old, rep);
    changed++;
    console.log("Nav:", rep.match(/label:"[^"]+"/)[0]);
  }
}

if (c.includes("Recommended For You")) {
  const fnStart = c.indexOf("function jC(");
  const fnEnd = c.indexOf("}const NC=", fnStart);
  const fn = c.slice(fnStart, fnEnd);

  const gridStart = fn.indexOf(
    ',a.jsxs("div",{className:"grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start",children:[a.jsxs("div",{className:"space-y-6 min-w-0",children:['
  );
  const sidebarIdx = fn.indexOf(',a.jsx("div",{id:"influnet-dashboard-sidebar-mount"');

  if (gridStart < 0 || sidebarIdx < 0) {
    console.error("MISSING jC grid block");
    process.exit(1);
  }

  const replacement =
    ',a.jsx("div",{id:"influnet-dashboard-pipeline-row-mount",className:"w-full"})';

  const sidebarEnd =
    sidebarIdx +
    ',a.jsx("div",{id:"influnet-dashboard-sidebar-mount",className:"w-full xl:sticky xl:top-4"})'.length;
  const newFn = fn.slice(0, gridStart) + replacement + fn.slice(sidebarEnd);

  c = c.slice(0, fnStart) + newFn + c.slice(fnEnd);
  changed++;
  console.log("Removed Recommended + Conversations; added pipeline mount");
}

if (!changed) {
  console.log("Already patched — dashboard home v2.");
  process.exit(0);
}

fs.writeFileSync(p, c);
console.log("Patched dashboard home v2.");
