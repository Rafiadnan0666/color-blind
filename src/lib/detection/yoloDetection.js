import * as ort from 'onnxruntime-web';

ort.env.wasm.wasmPaths = '/wasm/';

function hashColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 70%, 55%)`;
}

const DISPLAY_NAMES = {
  traffic_light_red: 'Red Light', traffic_light_green: 'Green Light', traffic_light_yellow: 'Yellow Light',
  rp1000: 'Rp 1.000', rp2000: 'Rp 2.000', rp5000: 'Rp 5.000', rp10000: 'Rp 10.000',
  rp20000: 'Rp 20.000', rp50000: 'Rp 50.000', rp100000: 'Rp 100.000',
  paracetamol: 'Paracetamol', panadol: 'Panadol', amoxicillin: 'Amoxicillin', vitamin_c: 'Vitamin C',
  '5 star': '5 Star', ALL_OUT_COIL: 'All Out Coil', ALL_OUT_REFILL: 'All Out Refill',
  'Aashirwaad atta': 'Aashirwaad Atta', 'Amul Butter': 'Amul Butter',
  Beardo: 'Beardo', Bisleri: 'Bisleri', Boost: 'Boost', Bournvita: 'Bournvita', Bru: 'Bru',
  'Cream and Onion Lays': 'Cream & Onion Lays', Dettol: 'Dettol',
  'Fortune Bottle': 'Fortune Bottle', 'Fortune Can': 'Fortune Can', 'Fortune Pouch': 'Fortune Pouch',
  'Fortune atta': 'Fortune Atta', 'Harpic Bathroom Cleaner': 'Harpic Bathroom', 'Harpic Toilet Cleaner': 'Harpic Toilet',
  Horlicks: 'Horlicks', Kikat: 'KitKat', Kinley: 'Kinley', KrackJack: 'KrackJack',
  Limea: 'Limea', Maggie: 'Maggi', 'Marie Gold': 'Marie Gold',
  Mirinda: 'Mirinda', Nestle: 'Nestlé', 'Odonil Green': 'Odonil Green', 'Odonil Purple': 'Odonil Purple',
  'Odonil Red': 'Odonil Red', 'Rin Bar': 'Rin Bar', 'Salted Lays': 'Salted Lays',
  Santoor: 'Santoor', 'Spicy Masala Lays': 'Spicy Masala Lays', Sprite: 'Sprite',
  Stayfree: 'Stayfree', 'Thumbs-Up': 'Thumbs Up', 'Tomato Lays': 'Tomato Lays',
  'Vim Bar': 'Vim Bar', Whisper: 'Whisper', WildStone: 'WildStone', Yippee: 'Yippee',
  munch: 'Munch', 'parle-G': 'Parle-G',
  crosswalk: 'Crosswalk', speedlimit: 'Speed Limit', stop: 'Stop Sign', trafficlight: 'Traffic Light',
};

const MODELS = {
  traffic_light: {
    path: '/model_onnx/traffic_light_yolov8n.onnx',
    classes: ['traffic_light_red', 'traffic_light_green', 'traffic_light_yellow'],
    colors: { traffic_light_red: '#ff0033', traffic_light_green: '#00cc44', traffic_light_yellow: '#ffcc00' },
  },
  currency: {
    path: '/model_onnx/currency_yolov8n.onnx',
    classes: ['rp1000', 'rp2000', 'rp5000', 'rp10000', 'rp20000', 'rp50000', 'rp100000'],
    colors: { rp1000: '#8B4513', rp2000: '#2E8B57', rp5000: '#4169E1', rp10000: '#8B008B', rp20000: '#006400', rp50000: '#B22222', rp100000: '#FF4500' },
  },
  medicine: {
    path: '/model_onnx/medicine_yolov8n.onnx',
    classes: ['paracetamol', 'panadol', 'amoxicillin', 'vitamin_c'],
    colors: { paracetamol: '#87CEEB', panadol: '#FFB6C1', amoxicillin: '#98FB98', vitamin_c: '#FFD700' },
  },
  local_products: {
    path: '/model_onnx/local_products_yolov8n.onnx',
    classes: [
      '5 star', 'ALL_OUT_COIL', 'ALL_OUT_REFILL', 'Aashirwaad atta', 'Amul Butter',
      'Beardo', 'Bisleri', 'Boost', 'Bournvita', 'Bru',
      'Cream and Onion Lays', 'Dettol', 'Fortune Bottle', 'Fortune Can', 'Fortune Pouch',
      'Fortune atta', 'Harpic Bathroom Cleaner', 'Harpic Toilet Cleaner', 'Horlicks', 'Kikat',
      'Kinley', 'KrackJack', 'Limea', 'Maggie', 'Marie Gold',
      'Mirinda', 'Nestle', 'Odonil Green', 'Odonil Purple', 'Odonil Red',
      'Rin Bar', 'Salted Lays', 'Santoor', 'Spicy Masala Lays', 'Sprite',
      'Stayfree', 'Thumbs-Up', 'Tomato Lays', 'Vim Bar', 'Whisper',
      'WildStone', 'Yippee', 'munch', 'parle-G',
    ],
    colors: {},
  },
  accessibility: {
    path: '/model_onnx/accessibility_yolov8n.onnx',
    classes: ['crosswalk', 'speedlimit', 'stop', 'trafficlight'],
    colors: { stop: '#ff0033', trafficlight: '#ffcc00', crosswalk: '#00ccff', speedlimit: '#ff9900' },
  },
};

const INPUT_SIZE = 640;
const CONF_THRESHOLD = 0.35;
const IOU_THRESHOLD = 0.45;

let sessions = {};
let loadAttempted = {};
let _origW = 0, _origH = 0;
let _scaleX = 1, _scaleY = 1;

export async function loadYoloModel(modelKey = 'traffic_light') {
  if (loadAttempted[modelKey]) return;
  loadAttempted[modelKey] = true;
  const cfg = MODELS[modelKey];
  if (!cfg) return;
  try {
    sessions[modelKey] = await ort.InferenceSession.create(cfg.path, {
      executionProviders: ['webgl', 'wasm', 'cpu'],
      graphOptimizationLevel: 'all',
    });
  } catch (e) {
    console.warn(`YOLO "${modelKey}" not loaded:`, e.message);
  }
}

export async function loadAllYoloModels() {
  await Promise.allSettled(Object.keys(MODELS).map(k => loadYoloModel(k)));
}

function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

function preprocess(source) {
  const cvs = document.createElement('canvas');
  let ctx;
  if (source instanceof HTMLVideoElement) {
    cvs.width = source.videoWidth; cvs.height = source.videoHeight;
    ctx = cvs.getContext('2d');
    ctx.drawImage(source, 0, 0);
  } else if (source instanceof HTMLCanvasElement) {
    ctx = source.getContext('2d');
  } else if (source instanceof HTMLImageElement) {
    cvs.width = source.naturalWidth; cvs.height = source.naturalHeight;
    ctx = cvs.getContext('2d');
    ctx.drawImage(source, 0, 0);
  } else {
    throw new Error('Unsupported source');
  }
  const imgData = ctx.getImageData(0, 0, cvs.width, cvs.height);
  _origW = imgData.width; _origH = imgData.height;
  _scaleX = _origW / INPUT_SIZE;
  _scaleY = _origH / INPUT_SIZE;
  const pixels = imgData.data;
  const float32Data = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
  for (let y = 0; y < INPUT_SIZE; y++) {
    for (let x = 0; x < INPUT_SIZE; x++) {
      const srcY = Math.min(Math.round(y * _scaleY), _origH - 1);
      const srcX = Math.min(Math.round(x * _scaleX), _origW - 1);
      const si = (srcY * _origW + srcX) * 4;
      float32Data[y * INPUT_SIZE + x] = pixels[si] / 255;
      float32Data[INPUT_SIZE * INPUT_SIZE + y * INPUT_SIZE + x] = pixels[si + 1] / 255;
      float32Data[2 * INPUT_SIZE * INPUT_SIZE + y * INPUT_SIZE + x] = pixels[si + 2] / 255;
    }
  }
  return new ort.Tensor('float32', float32Data, [1, 3, INPUT_SIZE, INPUT_SIZE]);
}

function decodeDetections(output, classNames) {
  const numClasses = classNames.length;
  const numDetections = output.dims[2];
  const data = output.data;
  const dets = [];
  for (let i = 0; i < numDetections; i++) {
    const cx = data[i];
    const cy = data[1 * numDetections + i];
    const w = data[2 * numDetections + i];
    const h = data[3 * numDetections + i];
    let maxScore = 0;
    let bestClass = -1;
    for (let c = 0; c < numClasses; c++) {
      const score = sigmoid(data[(4 + c) * numDetections + i]);
      if (score > maxScore) { maxScore = score; bestClass = c; }
    }
    if (maxScore < CONF_THRESHOLD) continue;
    const x1 = Math.max(0, (cx - w / 2) * _scaleX);
    const y1 = Math.max(0, (cy - h / 2) * _scaleY);
    const x2 = Math.min(_origW, (cx + w / 2) * _scaleX);
    const y2 = Math.min(_origH, (cy + h / 2) * _scaleY);
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

export async function detectYolo(source, modelKey = 'traffic_light') {
  if (!sessions[modelKey]) return [];
  const session = sessions[modelKey];
  const t = preprocess(source);
  const feeds = { [session.inputNames[0]]: t };
  const results = await session.run(feeds);
  const output = results[session.outputNames[0]];
  const classNames = MODELS[modelKey].classes;
  const dets = decodeDetections(output, classNames);
  for (const d of dets) {
    d.label = DISPLAY_NAMES[d.label] || d.label;
  }
  return dets;
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
