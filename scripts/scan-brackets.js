const fs = require("fs");
const c = fs.readFileSync("d:/influnet/influnet/assets/index-Bqfxp3sU.js", "utf8");

const stack = [];
const pairs = { ")": "(", "]": "[", "}": "{" };

function push(ch, i) {
  stack.push({ ch, i });
}

function scan() {
  let i = 0;
  while (i < c.length) {
    const ch = c[i];

    // line comment
    if (ch === "/" && c[i + 1] === "/") {
      i += 2;
      while (i < c.length && c[i] !== "\n") i++;
      continue;
    }
    // block comment
    if (ch === "/" && c[i + 1] === "*") {
      i += 2;
      while (i < c.length && !(c[i] === "*" && c[i + 1] === "/")) i++;
      i += 2;
      continue;
    }

    // strings
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      i++;
      if (quote === "`") {
        while (i < c.length) {
          if (c[i] === "\\") {
            i += 2;
            continue;
          }
          if (c[i] === "$" && c[i + 1] === "{") {
            i += 2;
            const inner = scanUntil("}");
            if (inner === null) return;
            i++;
            continue;
          }
          if (c[i] === "`") {
            i++;
            break;
          }
          i++;
        }
      } else {
        while (i < c.length) {
          if (c[i] === "\\") {
            i += 2;
            continue;
          }
          if (c[i] === quote) {
            i++;
            break;
          }
          i++;
        }
      }
      continue;
    }

    if (ch === "(" || ch === "[" || ch === "{") {
      push(ch, i);
    } else if (ch === ")" || ch === "]" || ch === "}") {
      const want = pairs[ch];
      const top = stack[stack.length - 1];
      if (!top || top.ch !== want) {
        console.log("MISMATCH at", i, "got", ch, "expected close for", top?.ch);
        console.log(c.slice(Math.max(0, i - 120), i + 120));
        return;
      }
      stack.pop();
    }
    i++;
  }
}

function scanUntil(end) {
  while (true) {
    const ch = c[i];
    if (ch === end) return true;
    if (i >= c.length) return null;
    // simplified - reuse main loop logic inline
    if (ch === "/" && c[i + 1] === "/") {
      i += 2;
      while (i < c.length && c[i] !== "\n") i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      i++;
      while (i < c.length) {
        if (c[i] === "\\") {
          i += 2;
          continue;
        }
        if (c[i] === quote) {
          i++;
          break;
        }
        i++;
      }
      continue;
    }
    if (ch === "(" || ch === "[" || ch === "{") push(ch, i);
    else if (ch === ")" || ch === "]" || ch === "}") {
      const want = pairs[ch];
      const top = stack[stack.length - 1];
      if (!top || top.ch !== want) {
        console.log("inner mismatch at", i, ch);
        return null;
      }
      stack.pop();
    }
    i++;
  }
}

scan();
console.log("unclosed count", stack.length);
if (stack.length) {
  const last = stack.slice(-5);
  for (const s of last) {
    console.log("unclosed", s.ch, "at", s.i, c.slice(s.i, s.i + 80));
  }
}

// Also count net braces
let net = 0;
for (const ch of c) {
  if (ch === "{") net++;
  if (ch === "}") net--;
}
console.log("net braces", net);
