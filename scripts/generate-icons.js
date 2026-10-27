import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Minimal compliant PNG generator in pure Node.js
function createPng(width, height, drawFn) {
  // RGBA buffer: 4 bytes per pixel + 1 filter byte per row
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressed = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR Chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', compressed);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const chunk = Buffer.alloc(4 + 4 + length + 4);
  chunk.writeUInt32BE(length, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  // Calculate CRC
  const crc = calcCrc(chunk.subarray(4, 8 + length));
  chunk.writeUInt32BE(crc, 8 + length);
  return chunk;
}

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function calcCrc(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Draw icon with Baxy Industrial Theme (Deep navy blue gradient, violet/cyan ring, center paint spray emblem)
function drawBaxyIcon(x, y, w, h, isMaskable) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const radius = w / 2;

  // Background gradient: from #0a1a46 (top-left) to #1b2d86 (bottom-right)
  const gradT = (x + y) / (w + h);
  let bgR = Math.round(10 * (1 - gradT) + 27 * gradT);
  let bgG = Math.round(26 * (1 - gradT) + 45 * gradT);
  let bgB = Math.round(70 * (1 - gradT) + 134 * gradT);

  // Safe area for maskable: full background bleed
  if (isMaskable) {
    // Keep central elements within 80% circle
    const safeRadius = radius * 0.75;
    // Central glowing disc
    if (dist <= safeRadius) {
      if (dist >= safeRadius - (w * 0.05) && dist <= safeRadius) {
        // Cyan / indigo ring
        return [56, 189, 248, 255]; // cyan accent
      }
      if (dist < safeRadius - (w * 0.05) && dist > safeRadius - (w * 0.12)) {
        return [99, 102, 241, 255]; // indigo ring
      }
      // Inner circle card
      if (dist <= safeRadius - (w * 0.12)) {
        // Inner gradient
        const innerT = dist / (safeRadius - w * 0.12);
        return [
          Math.round(19 + 25 * (1 - innerT)),
          Math.round(26 + 35 * (1 - innerT)),
          Math.round(49 + 60 * (1 - innerT)),
          255
        ];
      }
    }
    return [bgR, bgG, bgB, 255];
  }

  // Standard Non-maskable: rounded squircle boundary
  const cornerR = w * 0.22;
  const qx = Math.max(0, Math.abs(dx) - (w / 2 - cornerR));
  const qy = Math.max(0, Math.abs(dy) - (h / 2 - cornerR));
  const outsideDist = Math.sqrt(qx * qx + qy * qy);

  if (outsideDist > cornerR) {
    return [0, 0, 0, 0]; // Transparent outside squircle
  }

  // Border highlight
  if (outsideDist > cornerR - 3) {
    return [255, 255, 255, 60];
  }

  // Central glowing ring
  const ringR = radius * 0.65;
  const ringThick = w * 0.04;
  if (Math.abs(dist - ringR) <= ringThick) {
    return [56, 189, 248, 255]; // Cyan ring
  }

  // Center emblem area
  if (dist < ringR - ringThick) {
    // Subtle cross/sprayer motif
    if (Math.abs(dx) < w * 0.08 && Math.abs(dy) < h * 0.18) {
      return [226, 232, 240, 255]; // Light silver nozzle
    }
    if (Math.abs(dy) < h * 0.07 && Math.abs(dx) < h * 0.22) {
      return [99, 102, 241, 255]; // Violet canister
    }
    // Emerald quality check accent
    if (dx > w * 0.06 && dy > h * 0.06 && dist < ringR * 0.7) {
      return [52, 211, 153, 255]; // Emerald
    }
    return [19, 26, 49, 255];
  }

  return [bgR, bgG, bgB, 255];
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate 192x192
const png192 = createPng(192, 192, (x, y, w, h) => drawBaxyIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);

// Generate 512x512
const png512 = createPng(512, 512, (x, y, w, h) => drawBaxyIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);

// Generate Maskable 512x512 (with safe-zone margins and full-bleed background)
const pngMaskable512 = createPng(512, 512, (x, y, w, h) => drawBaxyIcon(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pngMaskable512);

// Generate Apple Touch Icon 180x180
const png180 = createPng(180, 180, (x, y, w, h) => drawBaxyIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), png180);

console.log('Successfully generated PWA and Android icons in /public!');
