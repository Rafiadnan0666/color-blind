const NAMED_COLORS = [
  ['black', 0, 0, 0],
  ['dark gray', 64, 64, 64],
  ['gray', 128, 128, 128],
  ['silver', 192, 192, 192],
  ['light gray', 211, 211, 211],
  ['gainsboro', 220, 220, 220],
  ['white smoke', 245, 245, 245],
  ['white', 255, 255, 255],
  ['maroon', 128, 0, 0],
  ['dark red', 139, 0, 0],
  ['brown', 165, 42, 42],
  ['firebrick', 178, 34, 34],
  ['crimson', 220, 20, 60],
  ['red', 255, 0, 0],
  ['tomato', 255, 99, 71],
  ['coral', 255, 127, 80],
  ['indian red', 205, 92, 92],
  ['light coral', 240, 128, 128],
  ['salmon', 250, 128, 114],
  ['dark salmon', 233, 150, 122],
  ['light salmon', 255, 160, 122],
  ['orange red', 255, 69, 0],
  ['dark orange', 255, 140, 0],
  ['orange', 255, 165, 0],
  ['goldenrod', 218, 165, 32],
  ['dark goldenrod', 184, 134, 11],
  ['gold', 255, 215, 0],
  ['amber', 255, 191, 0],
  ['yellow', 255, 255, 0],
  ['light yellow', 255, 255, 224],
  ['pale goldenrod', 238, 232, 170],
  ['khaki', 240, 230, 140],
  ['dark khaki', 189, 183, 107],
  ['yellow green', 154, 205, 50],
  ['olive', 128, 128, 0],
  ['olive drab', 107, 142, 35],
  ['lawn green', 124, 252, 0],
  ['chartreuse', 127, 255, 0],
  ['lime', 0, 255, 0],
  ['lime green', 50, 205, 50],
  ['green', 0, 128, 0],
  ['dark green', 0, 100, 0],
  ['forest green', 34, 139, 34],
  ['sea green', 46, 139, 87],
  ['medium sea green', 60, 179, 113],
  ['light green', 144, 238, 144],
  ['pale green', 152, 251, 152],
  ['spring green', 0, 255, 127],
  ['medium spring green', 0, 250, 154],
  ['teal', 0, 128, 128],
  ['dark cyan', 0, 139, 139],
  ['light sea green', 32, 178, 170],
  ['medium turquoise', 72, 209, 204],
  ['turquoise', 64, 224, 208],
  ['cyan', 0, 255, 255],
  ['aqua', 0, 255, 255],
  ['aquamarine', 127, 255, 212],
  ['pale turquoise', 175, 238, 238],
  ['light cyan', 224, 255, 255],
  ['navy', 0, 0, 128],
  ['dark blue', 0, 0, 139],
  ['medium blue', 0, 0, 205],
  ['blue', 0, 0, 255],
  ['royal blue', 65, 105, 225],
  ['steel blue', 70, 130, 180],
  ['dodger blue', 30, 144, 255],
  ['deep sky blue', 0, 191, 255],
  ['sky blue', 135, 206, 235],
  ['light sky blue', 135, 206, 250],
  ['cornflower blue', 100, 149, 237],
  ['slate blue', 106, 90, 205],
  ['medium slate blue', 123, 104, 238],
  ['dark slate blue', 72, 61, 139],
  ['indigo', 75, 0, 130],
  ['dark magenta', 139, 0, 139],
  ['purple', 128, 0, 128],
  ['medium purple', 147, 112, 219],
  ['dark violet', 148, 0, 211],
  ['blue violet', 138, 43, 226],
  ['magenta', 255, 0, 255],
  ['fuchsia', 255, 0, 255],
  ['orchid', 218, 112, 214],
  ['plum', 221, 160, 221],
  ['violet', 238, 130, 238],
  ['thistle', 216, 191, 216],
  ['lavender', 230, 230, 250],
  ['medium orchid', 186, 85, 211],
  ['deep pink', 255, 20, 147],
  ['hot pink', 255, 105, 180],
  ['light pink', 255, 182, 193],
  ['pink', 255, 192, 203],
  ['pale violet red', 219, 112, 147],
  ['medium violet red', 199, 21, 133],
  ['rosy brown', 188, 143, 143],
  ['saddle brown', 139, 69, 19],
  ['sienna', 160, 82, 45],
  ['chocolate', 210, 105, 30],
  ['peru', 205, 133, 63],
  ['sandy brown', 244, 164, 96],
  ['burlywood', 222, 184, 135],
  ['tan', 210, 180, 140],
  ['wheat', 245, 222, 179],
  ['navajo white', 255, 222, 173],
  ['moccasin', 255, 228, 181],
  ['peach puff', 255, 218, 185],
  ['bisque', 255, 228, 196],
  ['blanched almond', 255, 235, 205],
  ['cornsilk', 255, 248, 220],
  ['lemon chiffon', 255, 250, 205],
  ['honeydew', 240, 255, 240],
  ['mint cream', 245, 255, 250],
  ['azure', 240, 255, 255],
  ['alice blue', 240, 248, 255],
  ['ghost white', 248, 248, 255],
  ['ivory', 255, 255, 240],
  ['floral white', 255, 250, 240],
  ['old lace', 253, 245, 230],
  ['linen', 250, 240, 230],
  ['antique white', 250, 235, 215],
  ['beige', 245, 245, 220],
  ['slate gray', 112, 128, 144],
  ['light slate gray', 119, 136, 153],
  ['dim gray', 105, 105, 105],
];
export function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  let h = 0;
  const s = max === 0 ? 0 : diff / max;
  const v = max;
  if (diff !== 0) {
    switch (max) {
      case r: h = ((g - b) / diff + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / diff + 2) * 60; break;
      case b: h = ((r - g) / diff + 4) * 60; break;
    }
  }
  return { h, s, v };
}
export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}
export function colorDistance(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
}
export function areColorsSimilar(r1, g1, b1, r2, g2, b2, threshold = 60) {
  return colorDistance(r1, g1, b1, r2, g2, b2) < threshold;
}
function findClosestNamedColor(r, g, b) {
  let best = NAMED_COLORS[0];
  let bestDist = Infinity;
  for (const c of NAMED_COLORS) {
    const d = colorDistance(r, g, b, c[1], c[2], c[3]);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return { name: best[0], r: best[1], g: best[2], b: best[3] };
}
export function getColorBlindConfusion(r, g, b) {
  const { h, s, v } = rgbToHsv(r, g, b);
  const alerts = [];
  if (s < 0.15 || v < 0.1) return alerts;
  if ((h < 25 || h > 335) && s > 0.25 && v > 0.2) {
    alerts.push({ type: 'protanopia', label: 'Red-blind: may appear dark/brown' });
  }
  if (h > 75 && h < 165 && s > 0.25 && v > 0.2) {
    alerts.push({ type: 'deuteranopia', label: 'Green-blind: may appear brownish' });
  }
  if (h > 185 && h < 270 && s > 0.25 && v > 0.2) {
    alerts.push({ type: 'tritanopia', label: 'Blue-blind: may appear greenish' });
  }
  return alerts;
}
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}
export function rgbToColorName(r, g, b) {
  const { h, s, v } = rgbToHsv(r, g, b);
  if (v < 0.04) return 'black';
  if (v < 0.08) return 'very dark';
  if (s < 0.06) {
    if (v < 0.2) return 'dark gray';
    if (v < 0.4) return 'gray';
    if (v < 0.6) return 'silver';
    if (v < 0.8) return 'light gray';
    if (v < 0.93) return 'very light gray';
    return 'white';
  }
  const matched = findClosestNamedColor(r, g, b);
  const dist = colorDistance(r, g, b, matched.r, matched.g, matched.b);
  const baseName = matched.name;
  if (dist < 12) return baseName;
  const isNeutral = dist < 20 && (s < 0.15 || v > 0.92);
  if (isNeutral) return baseName;
  if (v < 0.18) return `very dark ${baseName}`;
  if (v < 0.3) return `dark ${baseName}`;
  if (v > 0.85 && s < 0.3) return `light ${baseName}`;
  if (v > 0.9 && s < 0.45) return `pale ${baseName}`;
  if (v > 0.92 && s > 0.6) return `bright ${baseName}`;
  if (s < 0.2) return `pale ${baseName}`;
  if (s < 0.35 && v > 0.4) return `light ${baseName}`;
  if (s < 0.35) return `grayish ${baseName}`;
  return baseName;
}
function sourceToCanvas(source) {
  const cvs = document.createElement('canvas');
  if (source instanceof HTMLVideoElement) {
    cvs.width = source.videoWidth;
    cvs.height = source.videoHeight;
  } else if (source instanceof HTMLImageElement) {
    cvs.width = source.naturalWidth;
    cvs.height = source.naturalHeight;
  } else if (source instanceof HTMLCanvasElement) {
    cvs.width = source.width;
    cvs.height = source.height;
  } else {
    cvs.width = 320;
    cvs.height = 240;
  }
  const ctx = cvs.getContext('2d');
  if (ctx) ctx.drawImage(source, 0, 0);
  return cvs;
}
export function sampleRegionColor(source, x, y, w, h) {
  const cvs = sourceToCanvas(source);
  const ctx = cvs.getContext('2d');
  if (!ctx) return { r: 0, g: 0, b: 0, name: 'unknown', hex: '#000000', hsl: { h: 0, s: 0, l: 0 }, confusion: [], samplePos: { x: 0, y: 0 } };
  const sx = Math.max(0, Math.floor(x));
  const sy = Math.max(0, Math.floor(y));
  const sw = Math.max(1, Math.floor(Math.min(w, cvs.width - sx)));
  const sh = Math.max(1, Math.floor(Math.min(h, cvs.height - sy)));
  const pixelData = ctx.getImageData(sx, sy, sw, sh).data;
  const pixelCount = (pixelData.length / 4) | 0;
  const pixels = [];
  let sumR = 0, sumG = 0, sumB = 0;
  for (let i = 0; i < pixelData.length; i += 4) {
    const r = pixelData[i], g = pixelData[i + 1], b = pixelData[i + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    pixels.push({ r, g, b, lum });
    sumR += r; sumG += g; sumB += b;
  }
  pixels.sort((a, b) => a.lum - b.lum);
  const mid = (pixelCount / 2) | 0;
  const median = pixels[mid];
  const meanR = sumR / pixelCount;
  const meanG = sumG / pixelCount;
  const meanB = sumB / pixelCount;
  const r = Math.round((median.r + meanR) / 2);
  const g = Math.round((median.g + meanG) / 2);
  const b = Math.round((median.b + meanB) / 2);
  const name = rgbToColorName(r, g, b);
  const hex = rgbToHex(r, g, b);
  const hsl = rgbToHsl(r, g, b);
  const confusion = getColorBlindConfusion(r, g, b);
  const samplePos = { x: sx + Math.floor(sw / 2), y: sy + Math.floor(sh / 2) };
  return { r, g, b, name, hex, hsl, confusion, samplePos };
}
export function extractPalette(source, maxColors, bx, by, bw, bh) {
  if (maxColors === undefined) maxColors = 12;
  if (bx !== undefined) {
    return extractPaletteFromRegion(source, maxColors, bx, by, bw, bh);
  }
  return extractPaletteFull(source, maxColors);
}
function extractPaletteFull(source, maxColors = 12) {
  const cvs = sourceToCanvas(source);
  const ctx = cvs.getContext('2d');
  if (!ctx) return [];
  const w = cvs.width;
  const h = cvs.height;
  const sampleSize = 80;
  const stepX = Math.max(1, Math.floor(w / sampleSize));
  const stepY = Math.max(1, Math.floor(h / sampleSize));
  const cols = Math.floor(w / stepX);
  const rows = Math.floor(h / stepY);
  const totalSamples = cols * rows;
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const colorBuckets = new Map();
  const colorPositions = new Map();
  for (let py = 0; py < h; py += stepY) {
    for (let px = 0; px < w; px += stepX) {
      const pi = (py * w + px) * 4;
      const r = data[pi], g = data[pi + 1], b = data[pi + 2];
      const qr = Math.round(r / 32) * 32;
      const qg = Math.round(g / 32) * 32;
      const qb = Math.round(b / 32) * 32;
      const key = `${qr},${qg},${qb}`;
      if (!colorBuckets.has(key)) {
        colorBuckets.set(key, { r: 0, g: 0, b: 0, count: 0 });
      }
      const bucket = colorBuckets.get(key);
      bucket.r += r;
      bucket.g += g;
      bucket.b += b;
      bucket.count++;
      if (!colorPositions.has(key)) {
        colorPositions.set(key, []);
      }
      const positions = colorPositions.get(key);
      if (positions.length < 3) {
        positions.push({ x: px, y: py });
      }
    }
  }
  const sorted = Array.from(colorBuckets.entries())
    .map(([key, bucket]) => ({
      key,
      r: Math.round(bucket.r / bucket.count),
      g: Math.round(bucket.g / bucket.count),
      b: Math.round(bucket.b / bucket.count),
      count: bucket.count,
      percentage: (bucket.count / totalSamples) * 100,
    }))
    .filter(c => c.percentage > 0.5)
    .sort((a, b) => b.count - a.count);
  const palette = [];
  const seen = new Set();
  for (const color of sorted) {
    if (palette.length >= maxColors) break;
    const qKey = `${Math.round(color.r / 48)},${Math.round(color.g / 48)},${Math.round(color.b / 48)}`;
    if (seen.has(qKey)) continue;
    seen.add(qKey);
    const name = rgbToColorName(color.r, color.g, color.b);
    const hex = rgbToHex(color.r, color.g, color.b);
    const positions = colorPositions.get(color.key) || [];
    const hsl = rgbToHsl(color.r, color.g, color.b);
    const confusion = getColorBlindConfusion(color.r, color.g, color.b);
    palette.push({
      r: color.r,
      g: color.g,
      b: color.b,
      name,
      hex,
      hsl,
      confusion,
      percentage: color.percentage,
      positions,
    });
  }
  palette.sort((a, b) => b.percentage - a.percentage);
  return palette;
}
function extractPaletteFromRegion(source, maxColors, bx, by, bw, bh) {
  const cvs = sourceToCanvas(source);
  const ctx = cvs.getContext('2d');
  if (!ctx) return [];
  const sx = Math.max(0, Math.floor(bx));
  const sy = Math.max(0, Math.floor(by));
  const sw = Math.max(1, Math.min(Math.floor(bw), cvs.width - sx));
  const sh = Math.max(1, Math.min(Math.floor(bh), cvs.height - sy));
  const imageData = ctx.getImageData(sx, sy, sw, sh);
  const data = imageData.data;
  const stepX = Math.max(1, Math.floor(sw / 24));
  const stepY = Math.max(1, Math.floor(sh / 24));
  const colorBuckets = new Map();
  const colorPositions = new Map();
  for (let py = 0; py < sh; py += stepY) {
    for (let px = 0; px < sw; px += stepX) {
      const pi = (py * sw + px) * 4;
      const r = data[pi], g = data[pi + 1], b = data[pi + 2];
      const qr = Math.round(r / 48) * 48;
      const qg = Math.round(g / 48) * 48;
      const qb = Math.round(b / 48) * 48;
      const key = `${qr},${qg},${qb}`;
      if (!colorBuckets.has(key)) {
        colorBuckets.set(key, { r: 0, g: 0, b: 0, count: 0 });
        colorPositions.set(key, []);
      }
      const bucket = colorBuckets.get(key);
      bucket.r += r; bucket.g += g; bucket.b += b;
      bucket.count++;
      const positions = colorPositions.get(key);
      if (positions.length < 2) {
        positions.push({ x: sx + px, y: sy + py });
      }
    }
  }
  const totalSamples = Math.ceil(sh / stepY) * Math.ceil(sw / stepX);
  if (totalSamples === 0) return [];
  const sorted = Array.from(colorBuckets.entries())
    .map(([key, bucket]) => ({
      key,
      r: Math.round(bucket.r / bucket.count),
      g: Math.round(bucket.g / bucket.count),
      b: Math.round(bucket.b / bucket.count),
      count: bucket.count,
      percentage: (bucket.count / totalSamples) * 100,
    }))
    .filter(c => c.percentage > 1)
    .sort((a, b) => b.count - a.count);
  const palette = [];
  const seen = new Set();
  for (const color of sorted) {
    if (palette.length >= maxColors) break;
    const qKey = `${Math.round(color.r / 64)},${Math.round(color.g / 64)},${Math.round(color.b / 64)}`;
    if (seen.has(qKey)) continue;
    seen.add(qKey);
    const name = rgbToColorName(color.r, color.g, color.b);
    const hex = rgbToHex(color.r, color.g, color.b);
    const positions = colorPositions.get(color.key) || [];
    palette.push({ r: color.r, g: color.g, b: color.b, name, hex, percentage: color.percentage, positions });
  }
  palette.sort((a, b) => b.percentage - a.percentage);
  return palette;
}
export function detectContour(source, x, y, w, h) {
  const cvs = sourceToCanvas(source);
  const ctx = cvs.getContext('2d');
  if (!ctx) return [];
  const sx = Math.max(0, Math.floor(x));
  const sy = Math.max(0, Math.floor(y));
  const sw = Math.max(2, Math.floor(Math.min(w, cvs.width - sx)));
  const sh = Math.max(2, Math.floor(Math.min(h, cvs.height - sy)));
  const imageData = ctx.getImageData(sx, sy, sw, sh);
  const data = imageData.data;
  const gray = new Float32Array(sw * sh);
  for (let i = 0; i < sw * sh; i++) {
    const pi = i * 4;
    gray[i] = data[pi] * 0.299 + data[pi + 1] * 0.587 + data[pi + 2] * 0.114;
  }
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  const magnitude = new Float32Array(sw * sh);
  let maxMag = 0;
  for (let y2 = 1; y2 < sh - 1; y2++) {
    for (let x2 = 1; x2 < sw - 1; x2++) {
      const idx = y2 * sw + x2;
      let gx = 0, gy = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const ki = (ky + 1) * 3 + (kx + 1);
          const pi2 = (y2 + ky) * sw + (x2 + kx);
          gx += gray[pi2] * sobelX[ki];
          gy += gray[pi2] * sobelY[ki];
        }
      }
      const mag = Math.sqrt(gx * gx + gy * gy);
      magnitude[idx] = mag;
      if (mag > maxMag) maxMag = mag;
    }
  }
  if (maxMag === 0) return [];
  const threshold = maxMag * 0.18;
  const points = [];
  for (let y2 = 2; y2 < sh - 2; y2 += 1) {
    for (let x2 = 2; x2 < sw - 2; x2 += 1) {
      const idx = y2 * sw + x2;
      if (magnitude[idx] > threshold) {
        const nn = magnitude[(y2 - 1) * sw + x2];
        const ns = magnitude[(y2 + 1) * sw + x2];
        const nw = magnitude[y2 * sw + x2 - 1];
        const ne = magnitude[y2 * sw + x2 + 1];
        if (magnitude[idx] > nn && magnitude[idx] > ns && magnitude[idx] > nw && magnitude[idx] > ne) {
          points.push({ x: sx + x2, y: sy + y2 });
        }
      }
    }
  }
  return simplifyContour(points, 1.5);
}
function simplifyContour(points, minDist) {
  if (points.length < 3) return points;
  const simplified = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - simplified[simplified.length - 1].x;
    const dy = points[i].y - simplified[simplified.length - 1].y;
    if (Math.sqrt(dx * dx + dy * dy) >= minDist) {
      simplified.push(points[i]);
    }
  }
  return simplified;
}
export function getColorGrid(source, gridSize = 20) {
  const cvs = sourceToCanvas(source);
  const ctx = cvs.getContext('2d');
  if (!ctx) return [];
  const w = cvs.width;
  const h = cvs.height;
  const stepX = Math.max(1, Math.floor(w / gridSize));
  const stepY = Math.max(1, Math.floor(h / gridSize));
  const pixelData = ctx.getImageData(0, 0, w, h).data;
  const grid = [];
  for (let py = 0; py < h; py += stepY) {
    for (let px = 0; px < w; px += stepX) {
      const pi = (py * w + px) * 4;
      const r = pixelData[pi], g = pixelData[pi + 1], b = pixelData[pi + 2];
      grid.push({
        x: px,
        y: py,
        r, g, b,
        name: rgbToColorName(r, g, b),
      });
    }
  }
  return grid;
}