/**
 * @param {number} r 0-255
 * @param {number} g 0-255
 * @param {number} b 0-255
 * @returns {{ h: number, s: number, v: number }}
 */
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

/**
 * @param {number} r 0-255
 * @param {number} g 0-255
 * @param {number} b 0-255
 * @returns {{ h: number, s: number, l: number }}
 */
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

/**
 * Weighted Euclidean distance between two RGB colors.
 * Weighted for human perception.
 * @param {number} r1
 * @param {number} g1
 * @param {number} b1
 * @param {number} r2
 * @param {number} g2
 * @param {number} b2
 * @returns {number}
 */
export function colorDistance(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db);
}

/**
 * Check if two colors are similar within a threshold.
 * @param {number} r1
 * @param {number} g1
 * @param {number} b1
 * @param {number} r2
 * @param {number} g2
 * @param {number} b2
 * @param {number} [threshold=60]
 * @returns {boolean}
 */
export function areColorsSimilar(r1, g1, b1, r2, g2, b2, threshold = 60) {
  return colorDistance(r1, g1, b1, r2, g2, b2) < threshold;
}

/**
 * Check if a color falls in a range that might be confused by
 * people with color vision deficiencies.
 * @param {number} r 0-255
 * @param {number} g 0-255
 * @param {number} b 0-255
 * @returns {Array<{type: string, label: string}>}
 */
export function getColorBlindConfusion(r, g, b) {
  const { h, s, v } = rgbToHsv(r, g, b);
  const alerts = /** @type {Array<{type: string, label: string}>} */ ([]);

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

/**
 * @param {number} r 0-255
 * @param {number} g 0-255
 * @param {number} b 0-255
 * @returns {string}
 */
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('');
}

/**
 * @param {number} r 0-255
 * @param {number} g 0-255
 * @param {number} b 0-255
 * @returns {string}
 */
export function rgbToColorName(r, g, b) {
  const { h, s, v } = rgbToHsv(r, g, b);

  if (v < 0.05) return 'black';
  if (v < 0.12) return 'very dark';

  if (s < 0.08) {
    if (v < 0.25) return 'dark gray';
    if (v < 0.45) return 'gray';
    if (v < 0.7) return 'light gray';
    if (v < 0.9) return 'very light gray';
    return 'white';
  }

  if (s < 0.15 && v > 0.85) return 'white';

  let baseName;
  if (h < 10 || h >= 345) baseName = 'red';
  else if (h < 25) baseName = 'orange red';
  else if (h < 40) baseName = 'orange';
  else if (h < 50) baseName = 'amber';
  else if (h < 65) baseName = 'golden';
  else if (h < 80) baseName = 'yellow';
  else if (h < 95) baseName = 'yellow green';
  else if (h < 100) baseName = 'lime';
  else if (h < 140) baseName = 'green';
  else if (h < 170) baseName = 'teal';
  else if (h < 195) baseName = 'cyan';
  else if (h < 215) baseName = 'sky blue';
  else if (h < 245) baseName = 'blue';
  else if (h < 270) baseName = 'indigo';
  else if (h < 295) baseName = 'purple';
  else if (h < 315) baseName = 'magenta';
  else if (h < 335) baseName = 'pink';
  else baseName = 'rose';

  if (s < 0.2) {
    if (v < 0.5) return `grayish ${baseName}`;
    return `pale ${baseName}`;
  }

  if (v < 0.25) return `dark ${baseName}`;
  if (v < 0.4) {
    if (s < 0.4) return `grayish ${baseName}`;
    return `dark ${baseName}`;
  }
  if (v > 0.85 && s < 0.4) return `light ${baseName}`;
  if (v > 0.92 && s < 0.55) return `bright ${baseName}`;

  return baseName;
}

/**
 * Convert a video/image source to a canvas element
 * @param {HTMLVideoElement | HTMLCanvasElement | HTMLImageElement} source
 * @returns {HTMLCanvasElement}
 */
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

/**
 * Sample the dominant (average) color from a bounding box region.
 * Uses a grid of sub-samples for better accuracy.
 * @param {HTMLVideoElement | HTMLCanvasElement | HTMLImageElement} source
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @returns {{ r: number, g: number, b: number, name: string, hex: string, hsl: { h: number, s: number, l: number }, confusion: Array<{type: string, label: string}> }}
 */
export function sampleRegionColor(source, x, y, w, h) {
  const cvs = sourceToCanvas(source);
  const ctx = cvs.getContext('2d');
  if (!ctx) return { r: 0, g: 0, b: 0, name: 'unknown', hex: '#000000', hsl: { h: 0, s: 0, l: 0 }, confusion: [] };

  const sx = Math.max(0, Math.floor(x));
  const sy = Math.max(0, Math.floor(y));
  const sw = Math.max(1, Math.floor(Math.min(w, cvs.width - sx)));
  const sh = Math.max(1, Math.floor(Math.min(h, cvs.height - sy)));

  const imageData = ctx.getImageData(sx, sy, sw, sh);
  const data = imageData.data;
  const pixelCount = (data.length / 4) | 0;

  const rs = new Uint8Array(pixelCount);
  const gs = new Uint8Array(pixelCount);
  const bs = new Uint8Array(pixelCount);

  for (let i = 0, j = 0; i < data.length; i += 4, j++) {
    rs[j] = data[i];
    gs[j] = data[i + 1];
    bs[j] = data[i + 2];
  }

  rs.sort();
  gs.sort();
  bs.sort();

  const mid = (pixelCount / 2) | 0;
  const r = rs[mid];
  const g = gs[mid];
  const b = bs[mid];

  const name = rgbToColorName(r, g, b);
  const hex = rgbToHex(r, g, b);
  const hsl = rgbToHsl(r, g, b);
  const confusion = getColorBlindConfusion(r, g, b);

  return { r, g, b, name, hex, hsl, confusion };
}

/**
 * Extract the most prominent colors from an image source.
 * Downsamples, quantizes, and clusters by frequency.
 * @param {HTMLVideoElement | HTMLCanvasElement | HTMLImageElement} source
 * @param {number} [maxColors]
 * @param {number} [bx]
 * @param {number} [by]
 * @param {number} [bw]
 * @param {number} [bh]
 * @returns {Array<{ r: number, g: number, b: number, name: string, hex: string, percentage: number, positions: Array<{x: number, y: number}> }>}
 */
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

  const colorBuckets = new Map();
  const colorPositions = new Map();

  for (let py = 0; py < h; py += stepY) {
    for (let px = 0; px < w; px += stepX) {
      const pixel = ctx.getImageData(px, py, 1, 1).data;
      const r = pixel[0], g = pixel[1], b = pixel[2];

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
      if (positions.length < 2) {
        positions.push({ x: px, y: py });
      }
    }
  }

  const totalSamples = (Math.floor(h / stepY)) * (Math.floor(w / stepX));

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

/**
 * @param {HTMLVideoElement | HTMLCanvasElement | HTMLImageElement} source
 * @param {number} maxColors
 * @param {number} bx
 * @param {number} by
 * @param {number} bw
 * @param {number} bh
 * @returns {Array<{ r: number, g: number, b: number, name: string, hex: string, percentage: number, positions: Array<{x: number, y: number}> }>}
 */
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

  const grid = [];
  for (let py = 0; py < h; py += stepY) {
    for (let px = 0; px < w; px += stepX) {
      const pixel = ctx.getImageData(px, py, 1, 1).data;
      const r = pixel[0], g = pixel[1], b = pixel[2];
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
