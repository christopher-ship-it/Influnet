const fs = require("fs");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
let c = fs.readFileSync(p, "utf8");

const replacements = [
  [
    '{number:"1",icon:ms,title:"Discover Creators",desc:"Search creators based on niche, followers, engagement, location and platform. Our intelligent filtering helps you find the perfect match for your brand voice in seconds.",tags:["#Aesthetic","#GenZ","#Lifestyle"],imgLabel:"influnet.com/tim",imgSub:"",side:"right"}',
    '{number:"1",icon:ms,title:"Shareable Creator Profiles",desc:"Every creator gets a professional Influnet profile URL. Brands visit links like influnet.com/tim to see your niche, audience, portfolio, and collaboration history—instantly.",tags:["#Profile","#Portfolio","#CreatorURL"],imgLabel:"influnet.com/tim",imgSub:"",imgFoot:"View Profile",side:"right"}',
  ],
  [
    'a.jsx("span",{className:"text-sm text-gray-300",children:k.title})',
    'a.jsx("span",{className:"text-sm text-gray-300",children:k.imgFoot||k.title})',
  ],
  [
    '{number:"01",icon:ms,title:"Discover Creators",description:"Search creators based on niche, followers, engagement, location and platform. Our intelligent filtering helps you find the perfect match for your brand voice in seconds.",tags:["#Aesthetic","#GenZ","#Lifestyle"]',
    '{number:"01",icon:ms,title:"Shareable Creator Profiles",description:"Every creator gets a professional Influnet profile URL. Brands visit links like influnet.com/tim to see your niche, audience, portfolio, and collaboration history—instantly.",tags:["#Profile","#Portfolio","#CreatorURL"]',
  ],
];

let ok = 0;
for (const [oldStr, newStr] of replacements) {
  if (!c.includes(oldStr)) {
    if (c.includes(newStr)) {
      console.log("already applied:", oldStr.slice(0, 70));
      ok++;
      continue;
    }
    console.error("MISSING:", oldStr.slice(0, 120));
    process.exit(1);
  }
  c = c.replace(oldStr, newStr);
  ok++;
}

fs.writeFileSync(p, c);
console.log("patched collab step1 copy (" + ok + " replacements)");
