// Crops a sprite image to the part you can see. The delivered art is 480 by 480 with a lot of empty margin, which
// makes sprites look small once they are shrunk to icon size. This crops to the visible part, centers it on a
// square (so shapes are not stretched) and adds a small margin. The originals in images/ are never changed.
// Only handles what the art uses: 8-bit RGBA PNGs that are not interlaced. Anything else is returned unchanged.
import { deflateSync, inflateSync } from 'node:zlib';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const VISIBLE_ALPHA = 20;
const MARGIN = 0.04; // of the final size, on every side

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

/** Undoes the PNG row filters. Returns raw RGBA rows, or null if the image is not a plain 8-bit RGBA PNG. */
function decode(png: Buffer): { width: number; height: number; pixels: Buffer } | null {
  if (!png.subarray(0, 8).equals(PNG_SIGNATURE)) return null;
  let width = 0;
  let height = 0;
  const parts: Buffer[] = [];
  for (let at = 8; at < png.length; ) {
    const length = png.readUInt32BE(at);
    const type = png.toString('ascii', at + 4, at + 8);
    const data = png.subarray(at + 8, at + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) return null; // 8-bit, RGBA, not interlaced
    } else if (type === 'IDAT') {
      parts.push(data);
    }
    at += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(parts));
  const stride = width * 4;
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!;
    for (let x = 0; x < stride; x++) {
      const value = raw[y * (stride + 1) + 1 + x]!;
      const left = x >= 4 ? pixels[y * stride + x - 4]! : 0;
      const up = y > 0 ? pixels[(y - 1) * stride + x]! : 0;
      const upLeft = y > 0 && x >= 4 ? pixels[(y - 1) * stride + x - 4]! : 0;
      let predicted = 0;
      if (filter === 1) predicted = left;
      else if (filter === 2) predicted = up;
      else if (filter === 3) predicted = (left + up) >> 1;
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        predicted = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
      } else if (filter > 4) return null;
      pixels[y * stride + x] = (value + predicted) & 0xff;
    }
  }
  return { width, height, pixels };
}

function encode(width: number, height: number, pixels: Buffer): Buffer {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) pixels.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride); // filter 0 (none)
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([PNG_SIGNATURE, chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

export function trimPng(png: Buffer): Buffer {
  const image = decode(png);
  if (!image) return png;
  const { width, height, pixels } = image;
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3]! > VISIBLE_ALPHA) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }
  if (right < left) return png; // nothing visible

  const contentWidth = right - left + 1;
  const contentHeight = bottom - top + 1;
  const side = Math.ceil(Math.max(contentWidth, contentHeight) / (1 - 2 * MARGIN));
  const offsetX = Math.floor((side - contentWidth) / 2);
  const offsetY = Math.floor((side - contentHeight) / 2);
  const out = Buffer.alloc(side * side * 4); // starts fully transparent
  for (let y = 0; y < contentHeight; y++) {
    pixels.copy(out, ((offsetY + y) * side + offsetX) * 4, ((top + y) * width + left) * 4, ((top + y) * width + left + contentWidth) * 4);
  }
  return encode(side, side, out);
}
