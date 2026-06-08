import { rgbToHsv, rgbToColorName } from './colorDetection';

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

function getAspectRatio(det) {
  if (!det || det.height === 0) return 1;
  return det.width / det.height;
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
    case 'coco':
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
