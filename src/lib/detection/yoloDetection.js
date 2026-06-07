import * as ort from 'onnxruntime-web';
ort.env.wasm.wasmPaths = '/wasm/';
function hashColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 70%, 55%)`;
}
const DISPLAY_NAMES = {
  rp1000: 'Rp 1.000', rp2000: 'Rp 2.000', rp5000: 'Rp 5.000', rp10000: 'Rp 10.000',
  rp20000: 'Rp 20.000', rp50000: 'Rp 50.000', rp100000: 'Rp 100.000',
  paracetamol: 'Paracetamol', panadol: 'Panadol', amoxicillin: 'Amoxicillin', vitamin_c: 'Vitamin C',
  traffic_light_red: 'Red Light', traffic_light_green: 'Green Light', traffic_light_yellow: 'Yellow Light',
  crosswalk: 'Crosswalk', speedlimit: 'Speed Limit', stop: 'Stop Sign', trafficlight: 'Traffic Light',
};
const MODELS = {
  accessibility: {
    path: '/models/accessibility_640.onnx',
    classes: ['crosswalk', 'speedlimit', 'stop', 'trafficlight'],
    inputSize: 640,
    isClassifier: false,
    colors: { stop: '#ff0033', trafficlight: '#ffcc00', crosswalk: '#00ccff', speedlimit: '#ff9900' },
  },
  currency: {
    path: '/models/currency_detection_640.onnx',
    classes: ['rp1000', 'rp2000', 'rp5000', 'rp10000', 'rp20000', 'rp50000', 'rp100000'],
    inputSize: 640,
    isClassifier: false,
    colors: { rp1000: '#8B4513', rp2000: '#2E8B57', rp5000: '#4169E1', rp10000: '#8B008B', rp20000: '#006400', rp50000: '#B22222', rp100000: '#FF4500' },
  },
  drug: {
    path: '/models/drug_detection_640.onnx',
    classes: ['paracetamol', 'panadol', 'amoxicillin', 'vitamin_c'],
    inputSize: 640,
    isClassifier: false,
    colors: { paracetamol: '#00ccff', panadol: '#ff6b35', amoxicillin: '#39ff14', vitamin_c: '#ffd700' },
  },
  traffic_light: {
    path: '/models/traffic_light_640.onnx',
    classes: ['traffic_light_red', 'traffic_light_green', 'traffic_light_yellow'],
    inputSize: 640,
    isClassifier: false,
    colors: { traffic_light_red: '#ff0033', traffic_light_green: '#00cc44', traffic_light_yellow: '#ffcc00' },
  },
  meat: {
    path: '/models/meat_freshness_classifier.onnx',
    classes: ['Fresh', 'Half-Fresh', 'Spoiled'],
    inputSize: 224,
    isClassifier: true,
    colors: { Fresh: '#39ff14', 'Half-Fresh': '#ffd700', Spoiled: '#ff0033' },
  },
  mushroom: {
    path: '/models/mushroom_classifier.onnx',
    classes: ['Autumn Skullcap', 'Death Cap', 'Destroying Angels', 'False Morel', 'Poison Fire Coral'],
    inputSize: 224,
    isClassifier: true,
    colors: { 'Autumn Skullcap': '#8B4513', 'Death Cap': '#ff0033', 'Destroying Angels': '#ffd700', 'False Morel': '#ff6b35', 'Poison Fire Coral': '#ff3366' },
  },
};
const CONF_THRESHOLD = 0.25;
const IOU_THRESHOLD = 0.45;
let sessions = {};
let loadAttempted = {};
let _origW = 0, _origH = 0;
let _scaleX = 1, _scaleY = 1;
let _padX = 0, _padY = 0;
let preprocessCanvas = null;
function getModelCfg(modelKey) {
  return MODELS[modelKey];
}
export async function loadYoloModel(modelKey = 'accessibility', onProgress) {
  if (loadAttempted[modelKey]) return;
  loadAttempted[modelKey] = true;
  const cfg = getModelCfg(modelKey);
  if (!cfg) { console.warn(`YOLO[${modelKey}]: unknown model`); return; }
  try {
    let ep = ['wasm'];
    try {
      if (typeof ort.env !== 'undefined' && ort.env.wasm) {
        ort.env.wasm.wasmPaths = '/wasm/';
      }
    } catch (_) {}
    if (onProgress) onProgress(modelKey, 'loading');
    sessions[modelKey] = await ort.InferenceSession.create(cfg.path, {
      executionProviders: ep,
      graphOptimizationLevel: 'all',
    });
    if (onProgress) onProgress(modelKey, 'ready');
  } catch (e) {
    console.error(`[MODEL_LOAD_ERROR] YOLO[${modelKey}]:`, e?.message || e);
    if (onProgress) onProgress(modelKey, 'error');
  }
}
export async function loadAllYoloModels(onProgress) {
  await Promise.allSettled(Object.keys(MODELS).map(k => loadYoloModel(k, onProgress)));
}
function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }
function softmax(arr) {
  const max = Math.max(...arr);
  const exps = arr.map(v => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(v => v / sum);
}
function captureSource(source) {
  if (!preprocessCanvas) preprocessCanvas = document.createElement('canvas');
  const cvs = preprocessCanvas;
  let srcW, srcH;
  if (source instanceof HTMLVideoElement) {
    cvs.width = source.videoWidth; cvs.height = source.videoHeight;
    cvs.getContext('2d').drawImage(source, 0, 0);
    srcW = cvs.width; srcH = cvs.height;
  } else if (source instanceof HTMLCanvasElement) {
    cvs.width = source.width; cvs.height = source.height;
    cvs.getContext('2d').drawImage(source, 0, 0);
    srcW = cvs.width; srcH = cvs.height;
  } else if (source instanceof HTMLImageElement) {
    cvs.width = source.naturalWidth; cvs.height = source.naturalHeight;
    cvs.getContext('2d').drawImage(source, 0, 0);
    srcW = cvs.width; srcH = cvs.height;
  } else {
    throw new Error('Unsupported source');
  }
  return { cvs, srcW, srcH };
}
function preprocessDetect(source, inputSize) {
  const { cvs, srcW, srcH } = captureSource(source);
  _origW = srcW; _origH = srcH;
  _scaleX = Math.min(inputSize / srcW, inputSize / srcH);
  const newW = Math.round(srcW * _scaleX);
  const newH = Math.round(srcH * _scaleX);
  const resized = document.createElement('canvas');
  resized.width = inputSize; resized.height = inputSize;
  const rctx = resized.getContext('2d');
  rctx.fillStyle = '#727272';
  rctx.fillRect(0, 0, inputSize, inputSize);
  _padX = Math.round((inputSize - newW) / 2);
  _padY = Math.round((inputSize - newH) / 2);
  rctx.drawImage(cvs, 0, 0, srcW, srcH, _padX, _padY, newW, newH);
  const imgData = rctx.getImageData(0, 0, inputSize, inputSize);
  const pixels = imgData.data;
  const float32Data = new Float32Array(3 * inputSize * inputSize);
  for (let i = 0; i < inputSize * inputSize; i++) {
    const si = i * 4;
    float32Data[i] = pixels[si] / 255;
    float32Data[inputSize * inputSize + i] = pixels[si + 1] / 255;
    float32Data[2 * inputSize * inputSize + i] = pixels[si + 2] / 255;
  }
  return new ort.Tensor('float32', float32Data, [1, 3, inputSize, inputSize]);
}
const IMAGENET_MEAN = [0.485, 0.456, 0.406];
const IMAGENET_STD = [0.229, 0.224, 0.225];

function preprocessClassify(source, inputSize) {
  const { cvs, srcW, srcH } = captureSource(source);
  _origW = srcW; _origH = srcH;
  const size = Math.min(srcW, srcH);
  const ox = Math.round((srcW - size) / 2);
  const oy = Math.round((srcH - size) / 2);
  const resized = document.createElement('canvas');
  resized.width = inputSize; resized.height = inputSize;
  const rctx = resized.getContext('2d');
  rctx.drawImage(cvs, ox, oy, size, size, 0, 0, inputSize, inputSize);
  const imgData = rctx.getImageData(0, 0, inputSize, inputSize);
  const pixels = imgData.data;
  const float32Data = new Float32Array(3 * inputSize * inputSize);
  for (let i = 0; i < inputSize * inputSize; i++) {
    const si = i * 4;
    float32Data[i] = (pixels[si] / 255 - IMAGENET_MEAN[0]) / IMAGENET_STD[0];
    float32Data[inputSize * inputSize + i] = (pixels[si + 1] / 255 - IMAGENET_MEAN[1]) / IMAGENET_STD[1];
    float32Data[2 * inputSize * inputSize + i] = (pixels[si + 2] / 255 - IMAGENET_MEAN[2]) / IMAGENET_STD[2];
  }
  return new ort.Tensor('float32', float32Data, [1, 3, inputSize, inputSize]);
}
function decodeDetections(output, classNames, inputSize) {
  const numClasses = classNames.length;
  const data = output.data;
  const dims = output.dims;
  if (!data || !dims || dims.length < 2) return [];
  const dets = [];
  let numDetections, stride, bboxOffset;
  if (dims.length === 3 && dims[0] === 1) {
    if (dims[1] === numClasses + 4) {
      numDetections = dims[2];
      stride = numDetections;
      bboxOffset = 0;
    } else if (dims[2] === numClasses + 4) {
      numDetections = dims[1];
      stride = dims[2];
      bboxOffset = 0;
    } else if (dims[1] === 4 + numClasses) {
      numDetections = dims[2];
      stride = numDetections;
      bboxOffset = 0;
    } else if (dims[2] === 4 + numClasses) {
      numDetections = dims[1];
      stride = dims[2];
      bboxOffset = 0;
    } else {
      return [];
    }
  } else if (dims.length === 2 && dims[0] === 1) {
    const totalCols = dims[1];
    const expectedCols = numClasses + 4;
    if (totalCols % expectedCols === 0) {
      numDetections = totalCols / expectedCols;
      stride = expectedCols;
    } else {
      return [];
    }
  } else {
    return [];
  }
  const totalVals = numDetections * stride;
  for (let i = 0; i < numDetections; i++) {
    const idx = bboxOffset + i;
    if (idx >= totalVals) break;
    const cx = data[idx] || 0;
    const cy = data[bboxOffset + 1 * stride + i] || 0;
    const w = data[bboxOffset + 2 * stride + i] || 0;
    const h = data[bboxOffset + 3 * stride + i] || 0;
    if (w <= 0 || h <= 0) continue;
    let maxScore = 0, bestClass = -1;
    for (let c = 0; c < numClasses; c++) {
      const ci = bboxOffset + (4 + c) * stride + i;
      const score = ci < totalVals ? sigmoid(data[ci]) : 0;
      if (score > maxScore) { maxScore = score; bestClass = c; }
    }
    if (maxScore < CONF_THRESHOLD || bestClass < 0) continue;
    const x1 = Math.max(0, (cx - w / 2 - _padX) / _scaleX);
    const y1 = Math.max(0, (cy - h / 2 - _padY) / _scaleX);
    const x2 = Math.min(_origW, (cx + w / 2 - _padX) / _scaleX);
    const y2 = Math.min(_origH, (cy + h / 2 - _padY) / _scaleX);
    if (x2 <= x1 || y2 <= y1) continue;
    dets.push({ x1, y1, x2, y2, width: x2 - x1, height: y2 - y1, score: maxScore, classId: bestClass, label: classNames[bestClass], model: 'yolo' });
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
export async function detectYolo(source, modelKey = 'accessibility') {
  if (!sessions[modelKey]) { console.warn(`YOLO[${modelKey}]: session not loaded`); return []; }
  const cfg = getModelCfg(modelKey);
  if (!cfg) { console.warn(`YOLO[${modelKey}]: unknown model config`); return []; }
  const session = sessions[modelKey];
  if (!session) return [];
  try {
    if (cfg.isClassifier) {
      return classifyImage(source, modelKey, cfg, session);
    }
    const t = preprocessDetect(source, cfg.inputSize);
    const feeds = { [session.inputNames[0]]: t };
    const results = await session.run(feeds);
    if (!results || !session.outputNames || !session.outputNames[0]) return [];
    const output = results[session.outputNames[0]];
    if (!output) return [];
    const dets = decodeDetections(output, cfg.classes, cfg.inputSize);
    for (const d of dets) {
      d.label = DISPLAY_NAMES[d.label] || d.label;
    }
    return dets;
  } catch (e) {
    console.error(`YOLO[${modelKey}] detect error:`, e?.message || e);
    return [];
  }
}
async function classifyImage(source, modelKey, cfg, session) {
  try {
    const t = preprocessClassify(source, cfg.inputSize);
    const feeds = { [session.inputNames[0]]: t };
    const results = await session.run(feeds);
    if (!results || !session.outputNames?.[0]) return [];
    const output = results[session.outputNames[0]];
    if (!output || !output.data) return [];
    const probs = softmax(Array.from(output.data));
    const bestIdx = probs.indexOf(Math.max(...probs));
    if (bestIdx < 0 || bestIdx >= cfg.classes.length) return [];
    const score = probs[bestIdx];
    const label = cfg.classes[bestIdx];
    if (score < 0.05) return [];
    const size = Math.min(_origW, _origH);
    const ox = Math.round((_origW - size) / 2);
    const oy = Math.round((_origH - size) / 2);
    const margin = 0.1;
    return [{
      x1: ox + size * margin,
      y1: oy + size * margin,
      x2: ox + size * (1 - margin),
      y2: oy + size * (1 - margin),
      width: size * (1 - 2 * margin),
      height: size * (1 - 2 * margin),
      score,
      classId: bestIdx,
      label: DISPLAY_NAMES[label] || label,
      model: 'yolo',
      isClassifier: true,
    }];
  } catch (e) {
    console.error(`Classify[${modelKey}] error:`, e?.message || e);
    return [];
  }
}
export function getYoloColor(label) {
  for (const cfg of Object.values(MODELS)) {
    if (cfg.colors[label]) return cfg.colors[label];
  }
  const rawLabel = Object.entries(DISPLAY_NAMES).find(([, v]) => v === label)?.[0];
  if (rawLabel) {
    for (const cfg of Object.values(MODELS)) {
      if (cfg.colors[rawLabel]) return cfg.colors[rawLabel];
    }
  }
  return hashColor(label);
}
export function getYoloModelKeys() {
  return Object.keys(MODELS);
}
export function isClassifierModel(modelKey) {
  const cfg = getModelCfg(modelKey);
  return cfg ? cfg.isClassifier : false;
}