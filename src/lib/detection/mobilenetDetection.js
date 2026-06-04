import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

const INPUT_SIZE = 320;

const MODELS = {
  medicine: {
    path: '/model_mobilenet/medicine/model.json',
    classes: ['paracetamol', 'panadol', 'amoxicillin', 'vitamin_c'],
    colors: { paracetamol: '#87CEEB', panadol: '#FFB6C1', amoxicillin: '#98FB98', vitamin_c: '#FFD700' },
    displayNames: { paracetamol: 'Paracetamol', panadol: 'Panadol', amoxicillin: 'Amoxicillin', vitamin_c: 'Vitamin C' },
  },
};

const CONF_THRESHOLD = 0.3;
const IOU_THRESHOLD = 0.45;

let sessions = {};
let loadAttempted = {};

function hashColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 70%, 55%)`;
}

export async function loadMobileNetModel(modelKey = 'medicine') {
  if (loadAttempted[modelKey]) return;
  loadAttempted[modelKey] = true;
  const cfg = MODELS[modelKey];
  if (!cfg) {
    console.warn(`[MODEL_CONFIG_ERROR] Unknown MobileNet model: ${modelKey}`);
    return;
  }
  try {
    await tf.ready();
    sessions[modelKey] = await tf.loadGraphModel(cfg.path);
  } catch (e) {
    console.error(`[MODEL_LOAD_ERROR] MobileNetV2[${modelKey}]:`, e?.message || e);
  }
}

export async function loadAllMobileNetModels() {
  await Promise.allSettled(Object.keys(MODELS).map(k => loadMobileNetModel(k)));
}

export async function detectMobileNet(source, modelKey = 'medicine') {
  if (!sessions[modelKey]) {
    console.warn(`MobileNetV2[${modelKey}]: model not loaded`);
    return [];
  }
  const session = sessions[modelKey];
  const cfg = MODELS[modelKey];
  if (!cfg) {
    console.warn(`MobileNetV2[${modelKey}]: model configuration not found`);
    return [];
  }
  // Add background class (last index) for SSD model compatibility
  const classNames = [...cfg.classes, '__background__'];

  try {
    const tensor = preprocess(source);
    const predictions = await session.predict(tensor);
    const outputs = Array.isArray(predictions) ? predictions : [predictions];
    tensor.dispose();

    const dets = decodeSSDOutputs(outputs, classNames);
    for (const d of dets) {
      d.label = cfg.displayNames[d.label] || d.label;
    }
    return dets;
  } catch (e) {
    console.error(`MobileNetV2[${modelKey}] inference error:`, e);
    return [];
  }
}

function preprocess(source) {
  let imgTensor;
  if (source instanceof HTMLVideoElement) {
    imgTensor = tf.browser.fromPixels(source);
  } else if (source instanceof HTMLCanvasElement) {
    imgTensor = tf.browser.fromPixels(source);
  } else if (source instanceof HTMLImageElement) {
    imgTensor = tf.browser.fromPixels(source);
  } else {
    throw new Error('Unsupported source');
  }

  const resized = tf.image.resizeBilinear(imgTensor, [INPUT_SIZE, INPUT_SIZE]);
  const normalized = resized.div(127.5).sub(1.0);
  const batched = normalized.expandDims(0);

  imgTensor.dispose();
  resized.dispose();
  normalized.dispose();

  return batched;
}

function decodeSSDOutputs(outputs, classNames) {
  const numClasses = classNames.length;
  const dets = [];

  let scale = 1;
  for (let i = 0; i < outputs.length; i += 2) {
    const clsTensor = outputs[i];
    const boxTensor = outputs[i + 1];
    if (!clsTensor || !boxTensor) continue;

    const clsData = clsTensor.dataSync();
    const boxData = boxTensor.dataSync();
    const dims = clsTensor.shape;
    const gridH = dims[1];
    const gridW = dims[2];
    const numAnchors = dims[3] / numClasses;

    const cellW = 1 / gridW;
    const cellH = 1 / gridH;

    for (let cy = 0; cy < gridH; cy++) {
      for (let cx = 0; cx < gridW; cx++) {
        for (let a = 0; a < numAnchors; a++) {
          const clsOffset = ((cy * gridW + cx) * numAnchors + a) * numClasses;
          let maxScore = 0;
          let bestClass = -1;
          // Skip last class (background)
          for (let c = 0; c < numClasses - 1; c++) {
            const score = clsData[clsOffset + c];
            if (score > maxScore) {
              maxScore = score;
              bestClass = c;
            }
          }

          if (maxScore < CONF_THRESHOLD || bestClass < 0) continue;

          const boxOffset = ((cy * gridW + cx) * numAnchors + a) * 4;
          const dx = boxData[boxOffset];
          const dy = boxData[boxOffset + 1];
          const dw = boxData[boxOffset + 2];
          const dh = boxData[boxOffset + 3];

          const anchorCx = (cx + 0.5) * cellW;
          const anchorCy = (cy + 0.5) * cellH;
          const anchorW = cellW;
          const anchorH = cellH;

          const boxCx = anchorCx + dx * anchorW;
          const boxCy = anchorCy + dy * anchorH;
          const boxW = anchorW * Math.exp(dw);
          const boxH = anchorH * Math.exp(dh);

          const x1 = Math.max(0, (boxCx - boxW / 2) * INPUT_SIZE);
          const y1 = Math.max(0, (boxCy - boxH / 2) * INPUT_SIZE);
          const x2 = Math.min(INPUT_SIZE, (boxCx + boxW / 2) * INPUT_SIZE);
          const y2 = Math.min(INPUT_SIZE, (boxCy + boxH / 2) * INPUT_SIZE);

          dets.push({
            x1, y1, x2, y2,
            width: x2 - x1,
            height: y2 - y1,
            score: maxScore,
            classId: bestClass,
            label: classNames[bestClass],
            model: 'mobilenet',
          });
        }
      }
    }
  }

  dets.sort((a, b) => b.score - a.score);

  const keep = [];
  while (dets.length > 0) {
    const b = dets.shift();
    keep.push(b);
    for (let i = dets.length - 1; i >= 0; i--) {
      if (iou(b, dets[i]) >= IOU_THRESHOLD) dets.splice(i, 1);
    }
  }

  return keep;
}

function iou(a, b) {
  const x1 = Math.max(a.x1, b.x1), y1 = Math.max(a.y1, b.y1);
  const x2 = Math.min(a.x2, b.x2), y2 = Math.min(a.y2, b.y2);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  return inter / ((a.x2 - a.x1) * (a.y2 - a.y1) + (b.x2 - b.x1) * (b.y2 - b.y1) - inter + 1e-6);
}

export function getMobileNetColor(label) {
  for (const cfg of Object.values(MODELS)) {
    if (cfg.colors[label]) return cfg.colors[label];
  }
  const rawLabel = Object.entries(
    Object.values(MODELS).reduce((acc, cfg) => ({ ...acc, ...cfg.displayNames }), {})
  ).find(([, v]) => v === label)?.[0];
  if (rawLabel) {
    for (const cfg of Object.values(MODELS)) {
      if (cfg.colors[rawLabel]) return cfg.colors[rawLabel];
    }
  }
  return hashColor(label);
}

export function getMobileNetModelKeys() {
  return Object.keys(MODELS);
}
