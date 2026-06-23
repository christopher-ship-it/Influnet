const fs = require("fs");
const { execSync } = require("child_process");
const p = "d:/influnet/influnet/assets/index-Bqfxp3sU.js";
const c = fs.readFileSync(p, "utf8");

const candidates = [
  ["current", c],
  [
    "remove one })",
    c.replace("AC(q)})]})})]})]}),a.jsxs", "AC(q)})]})]})]}),a.jsxs"),
  ],
  [
    "fix-script target",
    c.replace("AC(q)})]})})]})]}),a.jsxs", "AC(q)})]})]}),a.jsxs"),
  ],
  [
    "revert to })]}),",
    c.replace("AC(q)})]})})]})]}),a.jsxs", "AC(q)})]}),a.jsxs"),
  ],
  [
    "remove })],",
    c.replace("AC(q)})]})})]})]}),a.jsxs", "AC(q)})]})]})}),a.jsxs"),
  ],
];

for (const [name, content] of candidates) {
  const tmp = "d:/influnet/scripts/_bundle-test.js";
  fs.writeFileSync(tmp, content);
  try {
    execSync(`npx esbuild "${tmp}" --bundle --outfile=NUL`, {
      stdio: "pipe",
      timeout: 30000,
    });
    console.log(name + ": OK");
  } catch (e) {
    const msg = e.stderr?.toString() || e.message;
    const line = msg.split("\n").find((l) => l.includes("ERROR")) || msg.slice(0, 120);
    console.log(name + ":", line.trim());
  }
}
