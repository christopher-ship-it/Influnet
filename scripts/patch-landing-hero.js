const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

const replacements = [
  [
    'className:"relative overflow-hidden bg-[#09090b] py-16 lg:py-24"',
    'className:"relative overflow-hidden bg-white py-16 lg:py-24"',
  ],
  [
    'a.jsxs("h1",{className:"text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.0] mb-6",children:["Where Influence",a.jsx("br",{}),a.jsx("span",{className:"bg-gradient-to-r from-purple-400 via-violet-400 to-pink-400 bg-clip-text text-transparent",children:"Meets"}),a.jsx("br",{}),"Opportunity"]}),a.jsx("p",{className:"text-gray-400 text-base leading-relaxed mb-8 max-w-md",children:"Influnet connects visionary brands with authentic influencers to create impactful collaborations and measurable growth."}),a.jsx(we,{href:"/signup?role=brand",children:a.jsxs(ve,{size:"lg",className:"gap-2 font-bold px-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30","data-testid":"button-hero-collaborate",children:["Collaborate ",a.jsx(an,{className:"size-4"})]})})',
    'a.jsx("div",{className:"inline-flex items-center rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-white mb-6 bg-gradient-to-r from-violet-600 via-primary to-pink-500",children:"Creator & Brand Platform"}),a.jsx("h1",{className:"text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.08] mb-6 text-gray-900",children:a.jsxs(a.Fragment,{children:["The Business Operating System for"," ",a.jsx("span",{className:"bg-gradient-to-r from-violet-600 via-primary to-pink-500 bg-clip-text text-transparent",children:"Influencers & Brands"})]})}),a.jsx("p",{className:"text-gray-600 text-base sm:text-lg leading-relaxed mb-8 max-w-xl",children:"Manage collaborations, campaigns, business communication, and partnerships — all from one professional platform."}),a.jsxs("div",{className:"flex flex-col sm:flex-row gap-3",children:[a.jsx(we,{href:"/signup",children:a.jsx(ve,{size:"lg",className:"gap-2 font-bold px-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30 text-white","data-testid":"button-hero-get-started",children:"Get Started"})}),a.jsx(we,{href:"/support",children:a.jsx(ve,{size:"lg",variant:"outline",className:"gap-2 font-bold px-8 border-2 border-gray-900 text-gray-900 hover:bg-gray-50 bg-white","data-testid":"button-hero-book-demo",children:"Book a Demo"})})]})',
  ],
  [
    'className:"grid grid-cols-2 sm:grid-cols-4 gap-6 mt-12 pt-10 border-t border-white/10",children:b6.map(k=>a.jsxs("div",{children:[a.jsx("div",{className:"text-xl font-black text-white",children:k.value})',
    'className:"grid grid-cols-2 sm:grid-cols-4 gap-6 mt-12 pt-10 border-t border-gray-200",children:b6.map(k=>a.jsxs("div",{children:[a.jsx("div",{className:"text-xl font-black text-gray-900",children:k.value})',
  ],
  [
    'className:"pointer-events-none absolute -top-40 -left-40 size-[600px] rounded-full bg-purple-700/25 blur-[120px]"}),a.jsx("div",{className:"pointer-events-none absolute -bottom-20 right-0 size-[500px] rounded-full bg-pink-600/20 blur-[120px]"}),a.jsx(g6,{}),a.jsxs("div",{className:"relative max-w-7xl mx-auto px-4 sm:px-8 grid lg:grid-cols-2 gap-12 items-center",children:[a.jsxs("div",{children:[a.jsx("div",{className:"inline-flex',
    'className:"pointer-events-none absolute -top-40 -left-40 size-[600px] rounded-full bg-violet-200/60 blur-[120px]"}),a.jsx("div",{className:"pointer-events-none absolute -bottom-20 right-0 size-[500px] rounded-full bg-pink-200/50 blur-[120px]"}),a.jsx(g6,{}),a.jsxs("div",{className:"relative max-w-7xl mx-auto px-4 sm:px-8 grid lg:grid-cols-2 gap-12 items-center",children:[a.jsxs("div",{children:[a.jsx("div",{className:"inline-flex',
  ],
];

let ok = 0;
for (const [oldStr, newStr] of replacements) {
  if (!c.includes(oldStr)) {
    console.error("MISSING:", oldStr.slice(0, 80));
    process.exit(1);
  }
  c = c.replace(oldStr, newStr);
  ok++;
}
fs.writeFileSync(p, c);
console.log("patched landing hero (" + ok + " replacements)");
