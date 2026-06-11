const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

const replacements = [
  [
    'className:"relative overflow-hidden bg-white py-16 lg:py-24"',
    'className:"relative overflow-hidden bg-[#09090b] py-16 lg:py-24"',
  ],
  [
    'bg-violet-200/60 blur-[120px]',
    'bg-purple-700/25 blur-[120px]',
  ],
  [
    'bg-pink-200/50 blur-[120px]',
    'bg-pink-600/20 blur-[120px]',
  ],
  [
    'bg-gradient-to-r from-violet-600 via-primary to-pink-500",children:"Creator & Brand Platform"}),a.jsx("h1",{className:"text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] mb-6 text-gray-900",children:a.jsxs(a.Fragment,{children:["The Business Operating System for"," ",a.jsx("span",{className:"bg-gradient-to-r from-violet-600 via-primary to-pink-500 bg-clip-text text-transparent",children:"Influencers & Brands"})]})}),a.jsx("p",{className:"text-gray-600 text-base sm:text-lg leading-relaxed mb-8 max-w-xl"',
    'bg-gradient-to-r from-purple-500 via-violet-500 to-pink-500",children:"Creator & Brand Platform"}),a.jsx("h1",{className:"text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] mb-6 text-white",children:a.jsxs(a.Fragment,{children:["The Business Operating System for"," ",a.jsx("span",{className:"bg-gradient-to-r from-purple-400 via-violet-400 to-pink-400 bg-clip-text text-transparent",children:"Influencers & Brands"})]})}),a.jsx("p",{className:"text-gray-400 text-base sm:text-lg leading-relaxed mb-8 max-w-xl"',
  ],
  [
    'variant:"outline",className:"gap-2 font-bold px-8 border-2 border-gray-900 text-gray-900 hover:bg-gray-50 bg-white","data-testid":"button-hero-book-demo"',
    'variant:"outline",className:"gap-2 font-bold px-8 border border-white/20 text-white hover:bg-white/10 bg-transparent","data-testid":"button-hero-book-demo"',
  ],
  [
    'border-t border-gray-200",children:b6.map(k=>a.jsxs("div",{children:[a.jsx("div",{className:"text-xl font-black text-gray-900",children:k.value})',
    'border-t border-white/10",children:b6.map(k=>a.jsxs("div",{children:[a.jsx("div",{className:"text-xl font-black text-white",children:k.value})',
  ],
];

let ok = 0;
for (const [oldStr, newStr] of replacements) {
  if (!c.includes(oldStr)) {
    console.error("MISSING:", oldStr.slice(0, 100));
    process.exit(1);
  }
  c = c.replace(oldStr, newStr);
  ok++;
}
fs.writeFileSync(p, c);
console.log("restored dark theme colors (" + ok + " replacements)");
