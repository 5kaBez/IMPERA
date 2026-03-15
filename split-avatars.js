/**
 * Split Dasha's 4x2 avatar grid into 8 individual PNGs
 * Run: node split-avatars.js
 *
 * Each avatar sits in a rounded-rect card with dark background.
 * We use per-avatar insets to crop cleanly inside the card border.
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const INPUT = path.join(__dirname, 'photo_5310121428625593625_y.jpg');
const OUTPUT_DIR = path.join(__dirname, 'client', 'public', 'avatars');

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const metadata = await sharp(INPUT).metadata();
  const imgW = metadata.width;
  const imgH = metadata.height;
  console.log(`Image: ${imgW}x${imgH}`);

  const cols = 4;
  const rows = 2;

  // Grid layout (outer padding + gaps between cards)
  const padLeft = 32;
  const padTop  = 48;
  const padRight = 32;
  const padBottom = 46;
  const gapX = 20;
  const gapY = 20;

  const contentW = imgW - padLeft - padRight;
  const contentH = imgH - padTop - padBottom;
  const cellW = Math.floor((contentW - gapX * (cols - 1)) / cols);
  const cellH = Math.floor((contentH - gapY * (rows - 1)) / rows);

  console.log(`Cell size: ${cellW}x${cellH}`);

  // Per-avatar insets: { top, right, bottom, left }
  // Aggressive: 24px default removes rounded-corner dark borders completely
  const d = 24; // default inset
  const avatarInsets = {
    1: { top: d,  right: d,  bottom: d,  left: d  },  // Баблс
    2: { top: d,  right: d,  bottom: d,  left: d  },  // Старк
    3: { top: d+6, right: d,  bottom: d,  left: d  },  // Блюи — extra top trim
    4: { top: d,  right: d+4, bottom: d+4, left: d  },  // Вайпер
    5: { top: d+4, right: d+4, bottom: d,  left: d  },  // Минт
    6: { top: 46,  right: 38,  bottom: 38,  left: 38 },  // Кубик — extra aggressive, more top
    7: { top: d+4, right: d,  bottom: d+8, left: d  },  // Арчи — extra bottom trim
    8: { top: d,  right: d+4, bottom: d+4, left: d  },  // Лимон
  };

  let idx = 1;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const rawX = padLeft + col * (cellW + gapX);
      const rawY = padTop + row * (cellH + gapY);

      const inset = avatarInsets[idx];

      const x = rawX + inset.left;
      const y = rawY + inset.top;
      const w = cellW - inset.left - inset.right;
      const h = cellH - inset.top - inset.bottom;

      // Safety: clamp to image bounds
      const safeW = Math.min(w, imgW - x);
      const safeH = Math.min(h, imgH - y);

      const outPath = path.join(OUTPUT_DIR, `${idx}.png`);

      await sharp(INPUT)
        .extract({ left: Math.round(x), top: Math.round(y), width: safeW, height: safeH })
        .resize(512, 512)
        .png({ quality: 95 })
        .toFile(outPath);

      console.log(`  ✅ ${idx}.png  crop(${x},${y} ${safeW}x${safeH}) -> 512x512`);
      idx++;
    }
  }

  console.log(`\nDone! ${idx - 1} avatars saved to ${OUTPUT_DIR}`);
}

main().catch(console.error);
