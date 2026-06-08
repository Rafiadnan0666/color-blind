import { rgbToHsv, rgbToColorName, extractPalette, detectContour } from './colorDetection';

const MEAT_COLOR_RANGES = {
  Fresh: {
    desc: 'Merah cerah / Bright red-pink',
    hRange: [0, 20],
    sMin: 0.4,
    vMin: 0.35,
    vMax: 0.9,
    altH: [340, 360],
    check: (h, s, v) => ((h >= 0 && h <= 20) || (h >= 340 && h <= 360)) && s >= 0.4 && v >= 0.35 && v <= 0.9,
  },
  'Half-Fresh': {
    desc: 'Merah kecoklatan / Reddish-brown',
    hRange: [0, 30],
    sMin: 0.2,
    vMin: 0.2,
    vMax: 0.6,
    altH: [340, 360],
    check: (h, s, v) => ((h >= 0 && h <= 30) || (h >= 340 && h <= 360)) && s >= 0.2 && s < 0.5 && v >= 0.2 && v <= 0.6,
  },
  Spoiled: {
    desc: 'Coklat/abu/kuning / Brown-gray-green',
    hRange: [20, 120],
    sMin: 0.05,
    vMin: 0.05,
    vMax: 0.5,
    check: (h, s, v) => h >= 20 && h <= 120 && s >= 0.05 && v >= 0.05 && v <= 0.5,
  },
};

const CURRENCY_COLORS = {
  rp1000: { desc: 'Coklat / Brown', expected: ['brown', 'saddle brown', 'chocolate'], hRange: [10, 50], sMin: 0.25, vMin: 0.2, vMax: 0.7 },
  rp2000: { desc: 'Hijau / Green', expected: ['green', 'dark green', 'forest green'], hRange: [70, 170], sMin: 0.2, vMin: 0.15, vMax: 0.6 },
  rp5000: { desc: 'Biru / Blue', expected: ['blue', 'royal blue', 'steel blue'], hRange: [180, 260], sMin: 0.2, vMin: 0.2, vMax: 0.7 },
  rp10000: { desc: 'Ungu / Purple', expected: ['purple', 'dark magenta', 'indigo'], hRange: [260, 330], sMin: 0.15, vMin: 0.15, vMax: 0.6 },
  rp20000: { desc: 'Hijau tua / Dark green', expected: ['dark green', 'green'], hRange: [80, 160], sMin: 0.15, vMin: 0.1, vMax: 0.45 },
  rp50000: { desc: 'Merah / Red', expected: ['red', 'dark red', 'crimson'], hRange: [0, 15], sMin: 0.3, vMin: 0.15, vMax: 0.7, altH: [345, 360] },
  rp100000: { desc: 'Merah-oranye / Red-orange', expected: ['orange red', 'red', 'dark orange'], hRange: [0, 30], sMin: 0.3, vMin: 0.2, vMax: 0.8, altH: [340, 360] },
};

const DRUG_COLORS = {
  paracetamol: { desc: 'Biru/putih / Blue-white', expected: ['blue', 'light blue', 'white', 'sky blue'], hRange: [180, 260], sMax: 0.5, vMin: 0.4 },
  panadol: { desc: 'Orange / Orange', expected: ['orange', 'dark orange', 'coral'], hRange: [10, 40], sMin: 0.4, vMin: 0.4, vMax: 0.9 },
  amoxicillin: { desc: 'Hijau / Green', expected: ['green', 'forest green', 'dark green'], hRange: [70, 160], sMin: 0.2, vMin: 0.2, vMax: 0.7 },
  vitamin_c: { desc: 'Kuning / Yellow', expected: ['yellow', 'gold', 'amber'], hRange: [40, 70], sMin: 0.3, vMin: 0.4, vMax: 0.95 },
};

const ACCESSIBILITY_COLORS = {
  stop: { desc: 'Merah & putih / Red & white', expected: ['red', 'dark red', 'crimson'], hRange: [0, 15], sMin: 0.4, vMin: 0.2, vMax: 0.9, altH: [345, 360] },
  speedlimit: { desc: 'Putih/merah / White-red', expected: ['white', 'red', 'light gray'], neutral: true },
  crosswalk: { desc: 'Putih / White', expected: ['white', 'light gray', 'silver'], neutral: true },
  trafficlight: { desc: 'Multi-warna / Multi-color', expected: ['red', 'green', 'yellow', 'black'], multi: true },
};

const TRAFFIC_LIGHT_COLORS = {
  traffic_light_red: { desc: 'Merah / Red', hRange: [0, 15], sMin: 0.5, vMin: 0.3, altH: [345, 360] },
  traffic_light_yellow: { desc: 'Kuning / Yellow', hRange: [40, 70], sMin: 0.5, vMin: 0.4 },
  traffic_light_green: { desc: 'Hijau / Green', hRange: [80, 160], sMin: 0.4, vMin: 0.3 },
};

const MUSHROOM_COLORS = {
  'Autumn Skullcap': { desc: 'Coklat / Brown', hRange: [10, 45], sMin: 0.15, vMin: 0.1, vMax: 0.5 },
  'Death Cap': { desc: 'Hijau pucat / Pale green', hRange: [60, 150], sMin: 0.05, sMax: 0.35, vMin: 0.2, vMax: 0.6 },
  'Destroying Angels': { desc: 'Putih / White', neutral: true, vMin: 0.7, sMax: 0.15 },
  'False Morel': { desc: 'Merah-coklat / Red-brown', hRange: [0, 30], sMin: 0.2, vMin: 0.15, vMax: 0.6, altH: [340, 360] },
  'Poison Fire Coral': { desc: 'Merah terang / Bright red', hRange: [0, 15], sMin: 0.4, vMin: 0.3, vMax: 0.8, altH: [345, 360] },
};

function averageColorFromRegion(canvas, x, y, w, h) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const sx = Math.max(0, Math.floor(x));
  const sy = Math.max(0, Math.floor(y));
  const sw = Math.max(1, Math.floor(Math.min(w, canvas.width - sx)));
  const sh = Math.max(1, Math.floor(Math.min(h, canvas.height - sy)));
  try {
    const data = ctx.getImageData(sx, sy, sw, sh).data;
    let sumR = 0, sumG = 0, sumB = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) {
      sumR += data[i]; sumG += data[i + 1]; sumB += data[i + 2]; n++;
    }
    if (n === 0) return null;
    return { r: sumR / n, g: sumG / n, b: sumB / n };
  } catch { return null; }
}

function getDominantColorInfo(canvas, x, y, w, h) {
  const avg = averageColorFromRegion(canvas, x, y, w, h);
  if (!avg) return null;
  const { h: hue, s, v } = rgbToHsv(Math.round(avg.r), Math.round(avg.g), Math.round(avg.b));
  const name = rgbToColorName(Math.round(avg.r), Math.round(avg.g), Math.round(avg.b));
  return { r: avg.r, g: avg.g, b: avg.b, h: hue, s, v, name };
}

function checkColorMatch(colorInfo, ranges) {
  if (!colorInfo) return { match: false, score: 0 };
  const { h, s, v } = colorInfo;
  if (ranges.neutral) {
    if (s < 0.15 && v > 0.6) return { match: true, score: 0.6 };
    return { match: false, score: 0.1 };
  }
  if (ranges.multi) {
    return { match: true, score: 0.3 };
  }
  let inRange = false;
  if (ranges.hRange) {
    const [hMin, hMax] = ranges.hRange;
    const altH = ranges.altH;
    inRange = (h >= hMin && h <= hMax) || (altH && h >= altH[0] && h <= altH[1]);
  } else {
    inRange = true;
  }
  const sOk = (ranges.sMin === undefined || s >= ranges.sMin) && (ranges.sMax === undefined || s <= ranges.sMax);
  const vOk = (ranges.vMin === undefined || v >= ranges.vMin) && (ranges.vMax === undefined || v <= ranges.vMax);

  if (inRange && sOk && vOk) return { match: true, score: 0.7 };
  if (inRange && (sOk || vOk)) return { match: true, score: 0.4 };
  return { match: false, score: 0.15 };
}

function getAspectRatio(det) {
  if (!det || det.height === 0) return 1;
  return det.width / det.height;
}

function captureSourceToCanvas(source) {
  const cvs = document.createElement('canvas');
  if (source instanceof HTMLVideoElement) {
    cvs.width = source.videoWidth;
    cvs.height = source.videoHeight;
    cvs.getContext('2d').drawImage(source, 0, 0);
  } else if (source instanceof HTMLCanvasElement) {
    cvs.width = source.width;
    cvs.height = source.height;
    cvs.getContext('2d').drawImage(source, 0, 0);
  } else if (source instanceof HTMLImageElement) {
    cvs.width = source.naturalWidth;
    cvs.height = source.naturalHeight;
    cvs.getContext('2d').drawImage(source, 0, 0);
  }
  return cvs;
}

export function analyzeMeat(det, source) {
  const canvas = captureSourceToCanvas(source);
  const colorInfo = getDominantColorInfo(canvas, det.x1, det.y1, det.width, det.height);

  let bestClass = det.label;
  let bestScore = det.score;
  let colorMatch = { match: false, score: 0 };
  let reasons = [];

  if (colorInfo) {
    const { h, s, v, name } = colorInfo;

    if (MEAT_COLOR_RANGES.Fresh.check(h, s, v)) {
      colorMatch = { match: true, score: 0.85 };
      reasons.push(`Warna merah cerah (${name})`);
    } else if (MEAT_COLOR_RANGES['Half-Fresh'].check(h, s, v)) {
      colorMatch = { match: true, score: 0.6 };
      reasons.push(`Warna merah kecoklatan (${name})`);
    } else if (MEAT_COLOR_RANGES.Spoiled.check(h, s, v)) {
      colorMatch = { match: true, score: 0.5 };
      reasons.push(`Warna kusam/coklat (${name})`);
    } else {
      reasons.push(`Warna tidak khas (${name})`);
    }
  }

  const ar = getAspectRatio(det);
  let shapeScore = 0.5;
  if (ar > 0.5 && ar < 2.5) shapeScore = 0.7;

  const comboScore = det.score * 0.55 + colorMatch.score * 0.3 + shapeScore * 0.15;

  let adjustedLabel = det.label;
  if (colorMatch.match && colorMatch.score > 0.6 && comboScore > 0.5) {
    if (colorInfo && MEAT_COLOR_RANGES.Spoiled.check(colorInfo.h, colorInfo.s, colorInfo.v) && colorMatch.score > 0.5 && det.label === 'Fresh') {
      adjustedLabel = 'Half-Fresh';
      reasons.push('Koreksi: warna tidak cocok untuk Fresh');
    }
  }

  return {
    label: adjustedLabel,
    originalLabel: det.label,
    confidence: Math.min(comboScore, 0.99),
    safety: adjustedLabel === 'Fresh' ? 'Aman dikonsumsi' : adjustedLabel === 'Half-Fresh' ? 'Segera olah' : 'BERBAHAYA! Jangan dimakan',
    advice: getMeatAdvice(adjustedLabel),
    color: adjustedLabel === 'Fresh' ? '#39ff14' : adjustedLabel === 'Half-Fresh' ? '#ffd700' : '#ff0033',
    icon: adjustedLabel === 'Fresh' ? 'fa-check-circle' : adjustedLabel === 'Half-Fresh' ? 'fa-exclamation-triangle' : 'fa-skull-crossbones',
    severity: adjustedLabel === 'Fresh' ? 'safe' : adjustedLabel === 'Half-Fresh' ? 'warning' : 'danger',
    reasons,
  };
}

function getMeatAdvice(label) {
  if (label === 'Fresh') return 'Daging segar, aman untuk dimasak dan dikonsumsi.';
  if (label === 'Half-Fresh') return 'Daging setengah segar, segera masak hari ini juga.';
  if (label === 'Spoiled') return 'Daging busuk! Jangan dikonsumsi. Segera buang.';
  return 'Tidak dapat mengidentifikasi daging.';
}

export function analyzeCurrency(det, source) {
  const canvas = captureSourceToCanvas(source);
  const colorInfo = getDominantColorInfo(canvas, det.x1, det.y1, det.width, det.height);
  const ar = getAspectRatio(det);
  let reasons = [];

  const expected = CURRENCY_COLORS[det.label];
  let colorMatch = { match: false, score: 0 };
  if (colorInfo && expected) {
    colorMatch = checkColorMatch(colorInfo, expected);
    if (colorMatch.match) {
      reasons.push(`Warna sesuai ${expected.desc} (${colorInfo.name})`);
    } else {
      reasons.push(`Warna tidak sesuai ${expected.desc} (${colorInfo.name})`);
    }
  }

  let shapeScore = 0.5;
  if (ar > 1.4 && ar < 2.2) shapeScore = 0.8;
  else if (ar > 1.2 && ar < 2.5) shapeScore = 0.6;
  else shapeScore = 0.3;

  let sizeScore = 0.5;
  const area = det.width * det.height;
  const frameArea = det._frameW && det._frameH ? det._frameW * det._frameH : 1;
  const relArea = area / frameArea;
  if (relArea > 0.05 && relArea < 0.5) sizeScore = 0.7;

  let label = det.label;
  if (colorMatch.match && colorMatch.score < 0.3 && shapeScore < 0.4) {
    label = det.label;
  }

  const comboScore = det.score * 0.5 + colorMatch.score * 0.25 + shapeScore * 0.15 + sizeScore * 0.1;

  const displayName = getCurrencyDisplay(label);
  return {
    label,
    originalLabel: det.label,
    confidence: Math.min(comboScore, 0.99),
    safety: displayName,
    advice: getCurrencyAdvice(label),
    color: getCurrencyColor(label),
    icon: 'fa-money-bill-wave',
    severity: 'info',
    colorMatch: colorMatch.match,
    reasons,
  };
}

function getCurrencyDisplay(label) {
  const m = { rp1000: 'Rp 1.000', rp2000: 'Rp 2.000', rp5000: 'Rp 5.000', rp10000: 'Rp 10.000', rp20000: 'Rp 20.000', rp50000: 'Rp 50.000', rp100000: 'Rp 100.000' };
  return m[label] || label;
}

function getCurrencyAdvice(label) {
  const a = {
    rp1000: 'Uang kertas Rp 1.000 — warna dominan coklat.',
    rp2000: 'Uang kertas Rp 2.000 — warna dominan hijau.',
    rp5000: 'Uang kertas Rp 5.000 — warna dominan biru.',
    rp10000: 'Uang kertas Rp 10.000 — warna dominan ungu.',
    rp20000: 'Uang kertas Rp 20.000 — warna dominan hijau tua.',
    rp50000: 'Uang kertas Rp 50.000 — warna dominan merah.',
    rp100000: 'Uang kertas Rp 100.000 — warna dominan merah-oranye.',
  };
  return a[label] || 'Uang kertas Indonesia.';
}

function getCurrencyColor(label) {
  const c = { rp1000: '#8B4513', rp2000: '#2E8B57', rp5000: '#4169E1', rp10000: '#8B008B', rp20000: '#006400', rp50000: '#B22222', rp100000: '#FF4500' };
  return c[label] || '#ffd700';
}

export function analyzeDrug(det, source) {
  const canvas = captureSourceToCanvas(source);
  const colorInfo = getDominantColorInfo(canvas, det.x1, det.y1, det.width, det.height);
  const ar = getAspectRatio(det);
  let reasons = [];

  const expected = DRUG_COLORS[det.label];
  let colorMatch = { match: false, score: 0 };
  if (colorInfo && expected) {
    colorMatch = checkColorMatch(colorInfo, expected);
    if (colorMatch.match) {
      reasons.push(`Warna sesuai ${expected.desc} (${colorInfo.name})`);
    } else {
      reasons.push(`Warna tidak sesuai ${expected.desc} (${colorInfo.name})`);
    }
  }

  let shapeLabel = 'tidak diketahui';
  let shapeScore = 0.5;
  if (ar > 0.3 && ar < 0.7) { shapeLabel = 'kapsul'; shapeScore = 0.7; }
  else if (ar > 0.7 && ar < 1.3) { shapeLabel = 'bulat/oval'; shapeScore = 0.6; }
  else if (ar > 1.3 && ar < 3) { shapeLabel = 'kotak/persegi'; shapeScore = 0.5; }
  reasons.push(`Bentuk: ${shapeLabel}`);

  let label = det.label;
  if (!colorMatch.match && det.score < 0.5) {
    label = det.label;
  }

  const comboScore = det.score * 0.5 + colorMatch.score * 0.3 + shapeScore * 0.2;

  return {
    label,
    originalLabel: det.label,
    confidence: Math.min(comboScore, 0.99),
    safety: getDrugSafety(label),
    advice: getDrugAdvice(label),
    color: getDrugColor(label),
    icon: 'fa-tablets',
    severity: 'info',
    colorMatch: colorMatch.match,
    reasons,
  };
}

function getDrugSafety(label) {
  const s = { paracetamol: 'Obat demam / Fever drug', panadol: 'Obat sakit kepala / Painkiller', amoxicillin: 'Antibiotik / Antibiotic', vitamin_c: 'Vitamin C / Supplement' };
  return s[label] || 'Obat / Medicine';
}

function getDrugAdvice(label) {
  const a = {
    paracetamol: 'Paracetamol: obat demam dan nyeri. Ikuti dosis anjuran.',
    panadol: 'Panadol: obat sakit kepala. Jangan melebihi dosis harian.',
    amoxicillin: 'Amoxicillin: antibiotik. Habiskan sesuai resep dokter.',
    vitamin_c: 'Vitamin C: suplemen kesehatan. Baik untuk daya tahan tubuh.',
  };
  return a[label] || 'Konsultasikan dengan apoteker sebelum penggunaan.';
}

function getDrugColor(label) {
  const c = { paracetamol: '#00ccff', panadol: '#ff6b35', amoxicillin: '#39ff14', vitamin_c: '#ffd700' };
  return c[label] || '#888';
}

export function analyzeAccessibility(det, source) {
  const canvas = captureSourceToCanvas(source);
  const colorInfo = getDominantColorInfo(canvas, det.x1, det.y1, det.width, det.height);
  const ar = getAspectRatio(det);
  let reasons = [];

  const expected = ACCESSIBILITY_COLORS[det.label];
  let colorMatch = { match: false, score: 0 };
  if (colorInfo && expected) {
    colorMatch = checkColorMatch(colorInfo, expected);
    if (colorMatch.match) {
      reasons.push(`Warna sesuai ${expected.desc} (${colorInfo.name})`);
    } else {
      reasons.push(`Warna: ${colorInfo.name}`);
    }
  }

  let shapeLabel = '';
  let shapeScore = 0.5;
  if (det.label === 'stop') {
    if (ar > 0.8 && ar < 1.2) { shapeLabel = 'bulat'; shapeScore = 0.9; }
    else { shapeLabel = 'tidak bulat'; shapeScore = 0.3; }
  } else if (det.label === 'speedlimit') {
    if (ar > 0.8 && ar < 1.2) { shapeLabel = 'bulat'; shapeScore = 0.8; }
    else { shapeLabel = 'tidak bulat'; shapeScore = 0.4; }
  } else if (det.label === 'crosswalk') {
    if (ar > 1.5) { shapeLabel = 'memanjang'; shapeScore = 0.6; }
    else { shapeLabel = 'pendek'; shapeScore = 0.4; }
  } else if (det.label === 'trafficlight') {
    if (ar < 0.6) { shapeLabel = 'tinggi'; shapeScore = 0.7; }
    else { shapeLabel = 'lebar'; shapeScore = 0.4; }
  }
  if (shapeLabel) reasons.push(`Bentuk: ${shapeLabel}`);

  const comboScore = det.score * 0.5 + colorMatch.score * 0.3 + shapeScore * 0.2;

  return {
    label: det.label,
    originalLabel: det.label,
    confidence: Math.min(comboScore, 0.99),
    safety: getAccessibilitySafety(det.label),
    advice: getAccessibilityAdvice(det.label),
    color: getAccessibilityColor(det.label),
    icon: 'fa-universal-access',
    severity: 'info',
    colorMatch: colorMatch.match,
    reasons,
  };
}

function getAccessibilitySafety(label) {
  const s = { stop: 'Stop Sign', speedlimit: 'Speed Limit', crosswalk: 'Crosswalk', trafficlight: 'Traffic Light' };
  return s[label] || 'Accessibility Sign';
}

function getAccessibilityAdvice(label) {
  const a = {
    stop: 'Rambu stop: berhenti sepenuhnya di persimpangan.',
    speedlimit: 'Rambu batas kecepatan: patuhi batas kecepatan yang berlaku.',
    crosswalk: 'Zebra cross: tempat penyebrangan pejalan kaki.',
    trafficlight: 'Lampu lalu lintas: perhatikan warna lampu.',
  };
  return a[label] || 'Rambu aksesibilitas.';
}

function getAccessibilityColor(label) {
  const c = { stop: '#ff0033', speedlimit: '#ff9900', crosswalk: '#00ccff', trafficlight: '#ffcc00' };
  return c[label] || '#888';
}

export function analyzeTrafficLight(det, source) {
  const canvas = captureSourceToCanvas(source);
  const ctx = canvas.getContext('2d');
  let reasons = [];

  const sx = Math.max(0, Math.floor(det.x1));
  const sy = Math.max(0, Math.floor(det.y1));
  const sw = Math.max(1, Math.floor(Math.min(det.width, canvas.width - sx)));
  const sh = Math.max(1, Math.floor(Math.min(det.height, canvas.height - sy)));

  let rCount = 0, gCount = 0, yCount = 0, total = 0;
  if (ctx) {
    try {
      const data = ctx.getImageData(sx, sy, sw, sh).data;
      for (let i = 0; i < data.length; i += 8) {
        const r = data[i], g = data[i + 1], b = data[i + 2];
        const { h, s, v } = rgbToHsv(r, g, b);
        if (s > 0.3 && v > 0.25) {
          if ((h >= 0 && h < 20) || (h >= 340 && h <= 360)) rCount++;
          else if (h >= 40 && h < 75) yCount++;
          else if (h >= 80 && h < 170) gCount++;
        }
        total++;
      }
    } catch {}
  }

  const rRatio = total > 0 ? rCount / total : 0;
  const gRatio = total > 0 ? gCount / total : 0;
  const yRatio = total > 0 ? yCount / total : 0;

  const expected = TRAFFIC_LIGHT_COLORS[det.label];
  let colorScore = 0.3;
  if (det.label === 'traffic_light_red' && rRatio > 0.02) colorScore = 0.8;
  else if (det.label === 'traffic_light_green' && gRatio > 0.02) colorScore = 0.8;
  else if (det.label === 'traffic_light_yellow' && yRatio > 0.02) colorScore = 0.8;

  if (rRatio > 0.01) reasons.push(`Merah: ${(rRatio * 100).toFixed(0)}%`);
  if (gRatio > 0.01) reasons.push(`Hijau: ${(gRatio * 100).toFixed(0)}%`);
  if (yRatio > 0.01) reasons.push(`Kuning: ${(yRatio * 100).toFixed(0)}%`);

  const ar = getAspectRatio(det);
  let shapeScore = 0.5;
  if (ar < 0.7) shapeScore = 0.75;
  else if (ar < 1) shapeScore = 0.6;

  const comboScore = det.score * 0.5 + colorScore * 0.3 + shapeScore * 0.2;

  let label = det.label;
  if (colorScore < 0.3 && det.score < 0.4) {
    label = det.label;
  }

  const dl = getTrafficLightDisplay(label);
  return {
    label,
    originalLabel: det.label,
    confidence: Math.min(comboScore, 0.99),
    safety: dl,
    advice: getTrafficLightAdvice(label, rRatio, gRatio, yRatio),
    color: getTrafficLightColor(label),
    icon: 'fa-traffic-light',
    severity: 'info',
    colorRatios: { red: rRatio, green: gRatio, yellow: yRatio },
    reasons,
  };
}

function getTrafficLightDisplay(label) {
  const m = { traffic_light_red: 'Red Light / Merah', traffic_light_green: 'Green Light / Hijau', traffic_light_yellow: 'Yellow Light / Kuning' };
  return m[label] || 'Traffic Light';
}

function getTrafficLightAdvice(label, r, g, y) {
  if (label === 'traffic_light_red' && r > 0.02) return 'Lampu merah: BERHENTI.';
  if (label === 'traffic_light_green' && g > 0.02) return 'Lampu hijau: JALAN.';
  if (label === 'traffic_light_yellow' && y > 0.02) return 'Lampu kuning: HATI-HATI.';
  return 'Lampu lalu lintas — perhatikan warna.';
}

function getTrafficLightColor(label) {
  const c = { traffic_light_red: '#ff0033', traffic_light_green: '#00cc44', traffic_light_yellow: '#ffcc00' };
  return c[label] || '#ffcc00';
}

export function analyzeMushroom(det, source) {
  const canvas = captureSourceToCanvas(source);
  const colorInfo = getDominantColorInfo(canvas, det.x1, det.y1, det.width, det.height);
  let reasons = [];

  const expected = MUSHROOM_COLORS[det.label];
  let colorMatch = { match: false, score: 0 };
  if (colorInfo && expected) {
    colorMatch = checkColorMatch(colorInfo, expected);
    if (colorMatch.match) {
      reasons.push(`Warna sesuai ${expected.desc} (${colorInfo.name})`);
    } else {
      reasons.push(`Warna: ${colorInfo.name} (tidak cocok ${expected.desc})`);
    }
  }

  const comboScore = det.score * 0.6 + colorMatch.score * 0.4;

  return {
    label: det.label,
    originalLabel: det.label,
    confidence: Math.min(comboScore, 0.99),
    toxicity: getMushroomToxicity(det.label),
    safety: getMushroomToxicity(det.label),
    advice: getMushroomAdvice(det.label),
    color: getMushroomColor(det.label),
    icon: 'fa-skull-crossbones',
    severity: getMushroomSeverity(det.label),
    colorMatch: colorMatch.match,
    reasons,
  };
}

function getMushroomToxicity(label) {
  const t = {
    'Autumn Skullcap': 'Sangat Beracun — Mematikan',
    'Death Cap': 'Sangat Beracun — Mematikan',
    'Destroying Angels': 'Sangat Beracun — Mematikan',
    'False Morel': 'Beracun — Berbahaya',
    'Poison Fire Coral': 'Sangat Beracun — Mematikan',
  };
  return t[label] || 'Tidak diketahui';
}

function getMushroomAdvice(label) {
  const a = {
    'Autumn Skullcap': 'Mengandung amatoxin yang merusak hati. Jangan sentuh atau makan!',
    'Death Cap': 'Jamur paling beracun di dunia! 1 kapsul cukup untuk membunuh orang dewasa.',
    'Destroying Angels': 'Mengandung amatoxin fatal. Gejala muncul 6-24 jam setelah konsumsi.',
    'False Morel': 'Mengandung gyromitrin yang dapat menyebabkan keracunan serius.',
    'Poison Fire Coral': 'Mengandung toksin trichothecene yang dapat diserap melalui kulit.',
  };
  return a[label] || 'Jamur tidak dikenal. JANGAN dikonsumsi tanpa identifikasi ahli.';
}

function getMushroomSeverity(label) {
  const s = {
    'Autumn Skullcap': 'deadly',
    'Death Cap': 'deadly',
    'Destroying Angels': 'deadly',
    'False Morel': 'danger',
    'Poison Fire Coral': 'deadly',
  };
  return s[label] || 'unknown';
}

function getMushroomColor(label) {
  const c = {
    'Autumn Skullcap': '#8B4513',
    'Death Cap': '#ff0033',
    'Destroying Angels': '#ffd700',
    'False Morel': '#ff6b35',
    'Poison Fire Coral': '#ff3366',
  };
  return c[label] || '#888';
}

export function analyzeCoco(det, source) {
  const canvas = captureSourceToCanvas(source);
  const colorInfo = getDominantColorInfo(canvas, det.x1, det.y1, det.width, det.height);
  const ar = getAspectRatio(det);
  let reasons = [];

  const foodItems = ['apple', 'banana', 'orange', 'broccoli', 'carrot', 'sandwich', 'hot dog', 'pizza', 'donut', 'cake', 'bowl', 'bottle', 'cup', 'wine glass'];
  const vehicleItems = ['car', 'truck', 'bus', 'bicycle', 'motorcycle', 'airplane', 'boat', 'train'];
  const animalItems = ['bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe'];

  if (foodItems.includes(det.label)) {
    if (colorInfo) {
      const foodColors = {
        apple: ['red', 'green', 'crimson'],
        banana: ['yellow', 'gold'],
        orange: ['orange', 'dark orange'],
        broccoli: ['green', 'dark green'],
        carrot: ['orange', 'dark orange'],
      };
      const expected = foodColors[det.label];
      if (expected && expected.includes(colorInfo.name)) {
        reasons.push(`Warna sesuai ${det.label} (${colorInfo.name})`);
      }
    }
  }

  if (vehicleItems.includes(det.label)) {
    if (ar > 1.2 && ar < 3) reasons.push('Proporsi kendaraan sesuai');
  }

  if (animalItems.includes(det.label)) {
    if (ar > 0.5 && ar < 2) reasons.push('Proporsi hewan sesuai');
  }

  const comboScore = det.score;

  return {
    label: det.label,
    originalLabel: det.label,
    confidence: Math.min(comboScore, 0.99),
    safety: det.label,
    advice: `Terdeteksi: ${det.label}.`,
    color: '#00e5ff',
    icon: 'fa-cube',
    severity: 'info',
    reasons,
  };
}

export function analyzeDetection(det, source, engineMode, frameW, frameH) {
  det._frameW = frameW;
  det._frameH = frameH;

  switch (engineMode) {
    case 'meat':
      return analyzeMeat(det, source);
    case 'mushroom':
      return analyzeMushroom(det, source);
    case 'currency':
      return analyzeCurrency(det, source);
    case 'drug':
      return analyzeDrug(det, source);
    case 'accessibility':
      return analyzeAccessibility(det, source);
    case 'traffic_light':
      return analyzeTrafficLight(det, source);
    case 'coco':
    case 'fusion':
      return analyzeCoco(det, source);
    default:
      return {
        label: det.label,
        originalLabel: det.label,
        confidence: det.score,
        safety: det.label,
        advice: `Terdeteksi: ${det.label}.`,
        color: '#888',
        icon: 'fa-cube',
        severity: 'info',
        reasons: [],
      };
  }
}
