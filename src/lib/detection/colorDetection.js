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
  ['rust', 183, 65, 14],
  ['terracotta', 226, 114, 91],
  ['cinnamon', 210, 105, 30],
  ['copper', 184, 115, 51],
  ['bronze', 205, 127, 50],
  ['mahogany', 192, 64, 0],
  ['burgundy', 128, 0, 32],
  ['wine', 114, 47, 55],
  ['candy apple red', 255, 8, 0],
  ['raspberry', 227, 11, 93],
  ['rose', 255, 0, 127],
  ['cerise', 222, 49, 99],
  ['mulberry', 197, 75, 140],
  ['lavender blush', 255, 240, 245],
  ['misty rose', 255, 228, 225],
  ['fuchsia rose', 195, 55, 100],
  ['peach', 255, 229, 180],
  ['apricot', 251, 206, 177],
  ['melon', 254, 186, 173],
  ['tangerine', 255, 153, 0],
  ['pumpkin', 255, 117, 24],
  ['marigold', 252, 168, 17],
  ['butter', 255, 255, 129],
  ['canary', 255, 255, 153],
  ['chartreuse yellow', 223, 255, 0],
  ['pear', 209, 226, 49],
  ['sage', 188, 184, 138],
  ['moss green', 138, 154, 91],
  ['emerald', 80, 200, 120],
  ['jade', 0, 168, 107],
  ['malachite', 11, 218, 81],
  ['pine', 1, 121, 111],
  ['fern', 113, 188, 120],
  ['celadon', 172, 225, 175],
  ['mint', 62, 180, 137],
  ['teal blue', 0, 124, 128],
  ['cerulean', 0, 123, 167],
  ['azure blue', 0, 127, 255],
  ['sapphire', 15, 82, 186],
  ['lapis lazuli', 38, 97, 156],
  ['cobalt', 0, 71, 171],
  ['denim', 21, 96, 189],
  ['periwinkle', 204, 204, 255],
  ['lilac', 200, 162, 200],
  ['lavender purple', 150, 120, 182],
  ['amethyst', 153, 102, 204],
  ['eggplant', 97, 64, 81],
  ['plum purple', 78, 39, 93],
  ['grape', 111, 45, 168],
  ['wisteria', 201, 160, 220],
  ['mauve', 224, 176, 255],
  ['taupe', 72, 60, 50],
  ['charcoal', 54, 69, 79],
  ['lead', 30, 30, 30],
  ['pewter', 151, 151, 156],
  ['gunmetal', 80, 90, 100],
  ['cream', 255, 253, 208],
  ['champagne', 247, 231, 206],
  ['ecru', 194, 178, 128],
  ['ivory black', 41, 36, 33],
];

function rgbToLinear(c) {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function getRelativeLuminance(r, g, b) {
  return 0.2126 * rgbToLinear(r) + 0.7152 * rgbToLinear(g) + 0.0722 * rgbToLinear(b);
}

export function getContrastRatio(r1, g1, b1, r2, g2, b2) {
  const l1 = getRelativeLuminance(r1, g1, b1);
  const l2 = getRelativeLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function rgbToXyz(r, g, b) {
  let rl = rgbToLinear(r);
  let gl = rgbToLinear(g);
  let bl = rgbToLinear(b);
  return {
    x: rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375,
    y: rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750,
    z: rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041,
  };
}

function xyzToLab(x, y, z) {
  const xn = 0.95047, yn = 1.0, zn = 1.08883;
  const fx = x / xn > 0.008856 ? Math.cbrt(x / xn) : (7.787 * x / xn + 16 / 116);
  const fy = y / yn > 0.008856 ? Math.cbrt(y / yn) : (7.787 * y / yn + 16 / 116);
  const fz = z / zn > 0.008856 ? Math.cbrt(z / zn) : (7.787 * z / zn + 16 / 116);
  return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export function rgbToLab(r, g, b) {
  const { x, y, z } = rgbToXyz(r, g, b);
  return xyzToLab(x, y, z);
}

export function deltaE76(l1, a1, b1, l2, a2, b2) {
  return Math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
}

function findClosestColorLab(r, g, b) {
  const lab = rgbToLab(r, g, b);
  let best = NAMED_COLORS[0];
  let bestDist = Infinity;
  for (const c of NAMED_COLORS) {
    const cLab = rgbToLab(c[1], c[2], c[3]);
    const d = deltaE76(lab.l, lab.a, lab.b, cLab.l, cLab.a, cLab.b);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return { name: best[0], r: best[1], g: best[2], b: best[3], distance: bestDist };
}

export function findClosestNamedColor(r, g, b) {
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

export function colorDistance(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  const rm = (r1 + r2) / 2;
  return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db + rm * (dr * dr - db * db) / 256);
}

export function areColorsSimilar(r1, g1, b1, r2, g2, b2, threshold = 60) {
  return colorDistance(r1, g1, b1, r2, g2, b2) < threshold;
}

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

export function getColorTemperature(r, g, b) {
  const { h, s, v } = rgbToHsv(r, g, b);
  if (v < 0.1) return 'black';
  if (s < 0.08) return v < 0.5 ? 'dark neutral' : 'neutral';
  if (h <= 30 || h >= 330) return 'warm';
  if (h <= 90) return 'warm';
  if (h <= 180) return 'cool';
  if (h <= 270) return 'cool';
  return 'warm';
}

export function getColorHarmonies(r, g, b) {
  const { h, s, v } = rgbToHsv(r, g, b);
  if (v < 0.05) return [];
  if (s < 0.05) return [];

  const hsl = (hue) => {
    const hsv = (h + hue) % 360;
    const hh = hsv / 60;
    const i = Math.floor(hh);
    const f = hh - i;
    const p = v * (1 - s);
    const q = v * (1 - s * f);
    const t = v * (1 - s * (1 - f));
    let rr, gg, bb;
    switch (i) {
      case 0: rr = v; gg = t; bb = p; break;
      case 1: rr = q; gg = v; bb = p; break;
      case 2: rr = p; gg = v; bb = t; break;
      case 3: rr = p; gg = q; bb = v; break;
      case 4: rr = t; gg = p; bb = v; break;
      default: rr = v; gg = p; bb = q; break;
    }
    return {
      r: Math.round(rr * 255), g: Math.round(gg * 255), b: Math.round(bb * 255),
      hex: rgbToHex(Math.round(rr * 255), Math.round(gg * 255), Math.round(bb * 255)),
    };
  };

  return [
    { name: 'Complementary', colors: [hsl(180)] },
    { name: 'Triadic 1', colors: [hsl(120)] },
    { name: 'Triadic 2', colors: [hsl(240)] },
    { name: 'Analogous 1', colors: [hsl(30)] },
    { name: 'Analogous 2', colors: [hsl(330)] },
    { name: 'Split Complement 1', colors: [hsl(150)] },
    { name: 'Split Complement 2', colors: [hsl(210)] },
  ];
}

export function getWcagLevel(ratio) {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA Large';
  return 'Fail';
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
  const labMatch = findClosestColorLab(r, g, b);
  const baseName = labMatch.name;
  if (labMatch.distance < 8) return baseName;
  const isNeutral = labMatch.distance < 15 && (s < 0.15 || v > 0.92);
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
  if (!ctx) return { r: 0, g: 0, b: 0, name: 'unknown', hex: '#000000', hsl: { h: 0, s: 0, l: 0 }, confusion: [], samplePos: { x: 0, y: 0 }, lab: { l: 0, a: 0, b: 0 }, temperature: 'neutral', harmonies: [] };
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
  const lab = rgbToLab(r, g, b);
  const temperature = getColorTemperature(r, g, b);
  const harmonies = getColorHarmonies(r, g, b);
  const samplePos = { x: sx + Math.floor(sw / 2), y: sy + Math.floor(sh / 2) };
  const whiteContrast = getContrastRatio(r, g, b, 255, 255, 255);
  const blackContrast = getContrastRatio(r, g, b, 0, 0, 0);
  return {
    r, g, b, name, hex, hsl, confusion, lab, temperature, harmonies,
    whiteContrast: Math.round(whiteContrast * 100) / 100,
    blackContrast: Math.round(blackContrast * 100) / 100,
    wcagWhite: getWcagLevel(whiteContrast),
    wcagBlack: getWcagLevel(blackContrast),
    samplePos,
  };
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
