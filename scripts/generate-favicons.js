/**
 * Crop Icon-PNG.png and emit standard favicon sizes (transparent background).
 * Requires: npm install sharp (run once from repo root).
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "influnet/Asset/Influnet-LOGO/Icon-PNG.png");
const OUT_DIR = path.join(ROOT, "influnet/Asset/Influnet-LOGO");

async function removeBlackBackground(sharp, input) {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r < 48 && g < 48 && b < 48) {
      data[i + 3] = 0;
    }
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  });
}

async function squareTransparentIcon(sharp, sharpInstance, marginRatio = 0.06) {
  const meta = await sharpInstance.metadata();
  const side = Math.max(meta.width, meta.height);
  const margin = Math.round(side * marginRatio);
  const canvas = side + margin * 2;

  return sharpInstance
    .extend({
      top: margin + Math.floor((side - meta.height) / 2),
      bottom: margin + Math.ceil((side - meta.height) / 2),
      left: margin + Math.floor((side - meta.width) / 2),
      right: margin + Math.ceil((side - meta.width) / 2),
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .resize(canvas, canvas, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    });
}

async function main() {
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    console.error("Run: npm install sharp --no-save (from repo root), then re-run this script.");
    process.exit(1);
  }

  if (!fs.existsSync(SRC)) {
    console.error("Missing source:", SRC);
    process.exit(1);
  }

  const trimmed = await sharp(SRC).trim().toBuffer();
  const transparent = await removeBlackBackground(sharp, trimmed);
  const squared = await squareTransparentIcon(sharp, transparent);
  const base = await squared.png().toBuffer();

  const sizes = [16, 32, 48, 180, 192, 512];
  for (const size of sizes) {
    const out = path.join(OUT_DIR, `favicon-${size}.png`);
    await sharp(base)
      .resize(size, size, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png()
      .toFile(out);
    console.log("wrote", out);
  }

  const favicon32 = path.join(ROOT, "influnet/favicon.png");
  const assetFavicon = path.join(ROOT, "influnet/Asset/favicon.png");
  const apple = path.join(OUT_DIR, "apple-touch-icon.png");

  await sharp(base)
    .resize(32, 32, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(favicon32);
  await sharp(base)
    .resize(32, 32, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(assetFavicon);
  await sharp(base)
    .resize(180, 180, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(apple);

  console.log("wrote", favicon32, assetFavicon, apple);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
