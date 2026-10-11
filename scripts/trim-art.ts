// Crops a sprite image to the part you can see. The delivered art is 480 by 480 with a lot of empty margin, which
// makes sprites look small once they are shrunk to icon size. This crops to the visible part, centers it on a
// square (so shapes are not stretched) and adds a small margin. The originals in images/ are never changed.
// Only handles what the art uses: 8-bit RGBA PNGs that are not interlaced. Anything else is returned unchanged.
import { deflateSync, inflateSync } from 'node:zlib';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const VISIBLE_ALPHA = 20;
const MARGIN = 0.04; // of the final size, on every side
// A visible blob smaller than this share of all visible pixels (and under SPECK_MAX_PIXELS) is a stray speck, not art.
// Without this, one faint pixel in a corner (images/sprout.png has one) widens the crop and pushes the art off-center.
const SPECK_SHARE = 0.001;
const SPECK_MAX_PIXELS = 40;

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

/** Marks visible pixels that belong to tiny isolated blobs (stray specks). Blobs are groups of touching visible pixels. */
function findSpecks(pixels: Buffer, width: number, height: number): Uint8Array {
  const speck = new Uint8Array(width * height);
  const seen = new Uint8Array(width * height);
  const blobs: number[][] = [];
  let visible = 0;
  for (let start = 0; start < width * height; start++) {
    if (seen[start] || pixels[start * 4 + 3]! <= VISIBLE_ALPHA) continue;
    const blob = [start];
    seen[start] = 1;
    for (let i = 0; i < blob.length; i++) {
      const x = blob[i]! % width;
      const y = Math.floor(blob[i]! / width);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          const at = ny * width + nx;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height || seen[at] || pixels[at * 4 + 3]! <= VISIBLE_ALPHA) continue;
          seen[at] = 1;
          blob.push(at);
        }
      }
    }
    visible += blob.length;
    blobs.push(blob);
  }
  for (const blob of blobs) {
    if (blob.length < SPECK_MAX_PIXELS && blob.length < visible * SPECK_SHARE) for (const at of blob) speck[at] = 1;
  }
  return speck;
}

export function trimPng(png: Buffer): Buffer {
  const image = decode(png);
  if (!image) return png;
  const { width, height, pixels } = image;
  const speck = findSpecks(pixels, width, height);
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3]! > VISIBLE_ALPHA && !speck[y * width + x]) {
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
    for (let x = 0; x < contentWidth; x++) {
      if (speck[(top + y) * width + left + x]) out.fill(0, ((offsetY + y) * side + offsetX + x) * 4, ((offsetY + y) * side + offsetX + x) * 4 + 4); // drop specks inside the crop
    }
  }
  return encode(side, side, out);
}
