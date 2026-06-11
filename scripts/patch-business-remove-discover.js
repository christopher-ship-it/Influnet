/**
 * Business dashboard: remove Discover Influencers nav, page, and CTAs.
 * Re-run after rebuilding the React bundle.
 */
const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

const patches = [
  {
    name: "nav item",
    old: '{id:"discover",Icon:za,label:"Discover Influencers"},',
    new: "",
  },
  {
    name: "discover route",
    old: 'case"discover":return a.jsx(SC,{setSection:r});',
    new: "",
  },
  {
    name: "profile back",
    old: 'onBack:()=>r("discover")',
    new: 'onBack:()=>r("home")',
  },
  {
    name: "nav highlight",
    old: "const J=s===R||R===\"discover\"&&I",
    new: "const J=s===R||R===\"home\"&&I",
  },
  {
    name: "onboarding card",
    old: '{Icon:za,title:"Discover Influencers",body:"Browse and search verified creators by niche, audience and engagement — then view their full profiles to find the right fit for your brand."},',
    new: "",
  },
  {
    name: "view all CTA",
    old: ',a.jsx("button",{className:"text-sm text-violet-600 font-semibold hover:underline",onClick:()=>s("discover"),children:"View all"})',
    new: "",
  },
  {
    name: "messages empty CTA",
    old: ',a.jsx("button",{className:"mt-4 text-sm font-semibold text-violet-600 hover:underline",onClick:()=>s("discover"),children:"Discover influencers"})',
    new: "",
  },
  {
    name: "saved empty CTA",
    old: ',a.jsx("button",{className:"mt-4 text-sm font-semibold text-violet-600 hover:underline",onClick:()=>s("discover"),children:"Discover influencers"})',
    new: "",
    replaceAll: true,
  },
  {
    name: "messages empty copy",
    old: "Reach out to influencers from Discover to start a conversation.",
    new: "Reach out to influencers to start a conversation.",
  },
  {
    name: "saved empty copy",
    old: "Shortlist influencers from Discover and they'll show up here for quick access.",
    new: "Shortlisted influencers will show up here for quick access.",
  },
];

let changed = 0;
for (const { name, old, new: rep, replaceAll } of patches) {
  if (!c.includes(old)) {
    if (rep === "" && !old) continue;
    const alreadyGone = rep !== "" ? c.includes(rep) : !c.includes(old);
    if (alreadyGone) {
      console.log(`Skip (already applied): ${name}`);
      continue;
    }
    console.error(`MISSING patch target: ${name}`);
    process.exit(1);
  }
  c = replaceAll ? c.replaceAll(old, rep) : c.replace(old, rep);
  changed++;
  console.log(`Applied: ${name}`);
}

if (!changed) {
  console.log("Already patched — Discover Influencers removed.");
  process.exit(0);
}

fs.writeFileSync(p, c);
console.log("Removed Discover Influencers from business dashboard.");
