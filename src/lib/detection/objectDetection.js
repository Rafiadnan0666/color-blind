import * as ort from 'onnxruntime-web';

ort.env.wasm.wasmPaths = '/wasm/';

const CLASS_NAMES = [
  'ripe_apple', 'unripe_apple', 'ripe_banana', 'unripe_banana',
  'ripe_orange', 'unripe_orange', 'ripe_strawberry', 'unripe_strawberry',
  'ripe_tomato', 'unripe_tomato', 'plant', 'other_object',
];

const MODEL_PATH = '/model.onnx';
const INPUT_SIZE = 320;
const CONF_THRESHOLD = 0.35;
const IOU_THRESHOLD = 0.45;
const NUM_ANCHORS = 3234;

/** @type {ort.InferenceSession | null} */
let session = null;
let loadAttempted = false;

let _origW = 0, _origH = 0, _scale = 1, _padX = 0, _padY = 0;

// Gallery for similarity search
/** @type {number[][]} */
let gallery = [];
/** @type {string[]} */
let galleryLabels = [];
/** @type {number[] | null} */
let lastEmbedding = null;

/** @param {string} str */
function hashColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 65%, 50%)`;
}

/** @returns {Float32Array} */
function getAnchors() {
  return /** @type {Float32Array} */ (/** @type {any} */ (self).ANCHORS);
}

export async function loadModel() {
  if (loadAttempted) return;
  loadAttempted = true;
  try {
    session = await ort.InferenceSession.create(MODEL_PATH, {
      executionProviders: ['webgl', 'wasm', 'cpu'],
      graphOptimizationLevel: 'all',
    });
  } catch (e) {
    console.warn('SSDLens model not loaded:', e);
  }
}

export { CLASS_NAMES as YOLO_CLASSES };

/** @param {ImageData} imgData */
function letterbox(imgData) {
  const srcW = imgData.width, srcH = imgData.height;
  const scale = Math.min(INPUT_SIZE / srcW, INPUT_SIZE / srcH);
  const newW = Math.round(srcW * scale), newH = Math.round(srcH * scale);
  const padX = Math.round((INPUT_SIZE - newW) / 2), padY = Math.round((INPUT_SIZE - newH) / 2);

  const cvs = document.createElement('canvas');
  cvs.width = INPUT_SIZE; cvs.height = INPUT_SIZE;
  const ctx = /** @type {CanvasRenderingContext2D} */ (cvs.getContext('2d'));
  ctx.fillStyle = '#727272';
  ctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);

  const tmp = document.createElement('canvas');
  tmp.width = srcW; tmp.height = srcH;
  const tctx = /** @type {CanvasRenderingContext2D} */ (tmp.getContext('2d'));
  tctx.putImageData(imgData, 0, 0);
  ctx.drawImage(tmp, padX, padY, newW, newH);

  return { resized: ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE), pad: [padX, padY], scale };
}

/**
 * @param {HTMLVideoElement | HTMLCanvasElement | HTMLImageElement} source
 * @returns {ort.Tensor}
 */
function preprocess(source) {
  const cvs = document.createElement('canvas');
  /** @type {CanvasRenderingContext2D} */
  let ctx;
  if (source instanceof HTMLVideoElement) {
    cvs.width = source.videoWidth; cvs.height = source.videoHeight;
    ctx = /** @type {CanvasRenderingContext2D} */ (cvs.getContext('2d'));
    ctx.drawImage(source, 0, 0);
  } else if (source instanceof HTMLCanvasElement) {
    ctx = /** @type {CanvasRenderingContext2D} */ (source.getContext('2d'));
  } else if (source instanceof HTMLImageElement) {
    cvs.width = source.naturalWidth; cvs.height = source.naturalHeight;
    ctx = /** @type {CanvasRenderingContext2D} */ (cvs.getContext('2d'));
    ctx.drawImage(source, 0, 0);
  } else {
    throw new Error('Unsupported source');
  }

  const imgData = ctx.getImageData(0, 0, cvs.width, cvs.height);
  _origW = imgData.width; _origH = imgData.height;
  const { resized, pad, scale } = letterbox(imgData);
  _scale = scale; _padX = pad[0]; _padY = pad[1];

  const pixels = resized.data;
  const float32Data = new Float32Array(3 * INPUT_SIZE * INPUT_SIZE);
  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];

  for (let y = 0; y < INPUT_SIZE; y++) {
    for (let x = 0; x < INPUT_SIZE; x++) {
      const si = (y * INPUT_SIZE + x) * 4;
      float32Data[y * INPUT_SIZE + x] = (pixels[si] / 255 - mean[0]) / std[0];
      float32Data[INPUT_SIZE * INPUT_SIZE + y * INPUT_SIZE + x] = (pixels[si + 1] / 255 - mean[1]) / std[1];
      float32Data[2 * INPUT_SIZE * INPUT_SIZE + y * INPUT_SIZE + x] = (pixels[si + 2] / 255 - mean[2]) / std[2];
    }
  }

  return new ort.Tensor('float32', float32Data, [1, 3, INPUT_SIZE, INPUT_SIZE]);
}

/**
 * @param {Float32Array} logits
 * @param {Float32Array} bboxReg
 * @param {Float32Array} embeddings
 * @returns {{detections: Array<{x1: number, y1: number, x2: number, y2: number, width: number, height: number, score: number, classId: number, label: string, model: string}>, embedding: number[]}}
 */
function decodeDetections(logits, bboxReg, embeddings) {
  const anchors = getAnchors();
  const numClasses = CLASS_NAMES.length;
  /** @type {Array<{x1: number, y1: number, x2: number, y2: number, width: number, height: number, score: number, classId: number, label: string, model: string}>} */
  const dets = [];

  for (let i = 0; i < NUM_ANCHORS; i++) {
    let maxScore = 0;
    let bestClass = -1;
    for (let c = 0; c < numClasses; c++) {
      const score = logits[i * numClasses + c];
      const prob = 1 / (1 + Math.exp(-score));
      if (prob > maxScore) { maxScore = prob; bestClass = c; }
    }
    if (maxScore < CONF_THRESHOLD) continue;

    const ax1 = anchors[i * 4], ay1 = anchors[i * 4 + 1];
    const ax2 = anchors[i * 4 + 2], ay2 = anchors[i * 4 + 3];
    const aw = ax2 - ax1, ah = ay2 - ay1;
    const acx = (ax1 + ax2) / 2, acy = (ay1 + ay2) / 2;

    const dx = bboxReg[i * 4], dy = bboxReg[i * 4 + 1];
    const dw = bboxReg[i * 4 + 2], dh = bboxReg[i * 4 + 3];

    let cx = dx * aw + acx;
    let cy = dy * ah + acy;
    let w = Math.exp(dw) * aw;
    let h = Math.exp(dh) * ah;

    let x1 = (cx - w / 2 - _padX) / _scale;
    let y1 = (cy - h / 2 - _padY) / _scale;
    let x2 = (cx + w / 2 - _padX) / _scale;
    let y2 = (cy + h / 2 - _padY) / _scale;

    dets.push({
      x1: Math.max(0, x1), y1: Math.max(0, y1),
      x2: Math.min(_origW, x2), y2: Math.min(_origH, y2),
      width: x2 - x1, height: y2 - y1,
      score: maxScore, classId: bestClass,
      label: CLASS_NAMES[bestClass], model: 'ssdlens',
    });
  }

  dets.sort((a, b) => b.score - a.score);
  /** @type {typeof dets} */
  const keep = [];
  while (dets.length > 0) {
    const b = dets.shift();
    if (!b) continue;
    keep.push(b);
    for (let i = dets.length - 1; i >= 0; i--) {
      if (iou(b, dets[i]) >= IOU_THRESHOLD) dets.splice(i, 1);
    }
  }

  return { detections: keep, embedding: Array.from(embeddings) };
}

/**
 * @param {{x1: number, y1: number, x2: number, y2: number}} a
 * @param {{x1: number, y1: number, x2: number, y2: number}} b
 */
function iou(a, b) {
  const x1 = Math.max(a.x1, b.x1), y1 = Math.max(a.y1, b.y1);
  const x2 = Math.min(a.x2, b.x2), y2 = Math.min(a.y2, b.y2);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  return inter / ((a.x2 - a.x1) * (a.y2 - a.y1) + (b.x2 - b.x1) * (b.y2 - b.y1) - inter);
}

/**
 * @param {HTMLVideoElement | HTMLCanvasElement | HTMLImageElement} source
 */
async function runModel(source) {
  if (!session) return { detections: [], embedding: null };
  const t = preprocess(source);
  const feeds = { input: t };
  const results = await session.run(feeds);
  const logits = /** @type {Float32Array} */ (results.logits.data);
  const bboxReg = /** @type {Float32Array} */ (results.bbox_reg.data);
  const embeddings = /** @type {Float32Array} */ (results.embeddings.data);
  lastEmbedding = Array.from(embeddings);
  return decodeDetections(logits, bboxReg, embeddings);
}

/**
 * @param {HTMLVideoElement | HTMLCanvasElement | HTMLImageElement} source
 * @param {'auto' | 'coco' | 'fruit'} [mode]
 */
export async function detectObjects(source, mode = 'auto') {
  const result = await runModel(source);
  return result.detections;
}

/** @param {string} label */
export function getColor(label) {
  return hashColor(label);
}

/**
 * @param {Array<{x1: number, y1: number, x2: number, y2: number, width: number, height: number, score: number, label: string, model: string}> | null} dets
 * @param {number} cw
 * @param {number} ch
 * @returns {{x1: number, y1: number, x2: number, y2: number, width: number, height: number, score: number, label: string, model: string} | null}
 */
export function pickNearestCenter(dets, cw, ch) {
  if (!dets || !dets.length) return null;
  const cx = cw / 2, cy = ch / 2;
  /** @type {{x1: number, y1: number, x2: number, y2: number, width: number, height: number, score: number, label: string, model: string} | null} */
  let best = null;
  let bestScore = 0;
  for (const d of dets) {
    const dcx = d.x1 + d.width / 2, dcy = d.y1 + d.height / 2;
    const dist = Math.sqrt((dcx - cx) ** 2 + (dcy - cy) ** 2);
    const score = d.score / (1 + dist / Math.max(cw, ch)) * Math.min((d.width * d.height) / (cw * ch * 0.5), 1);
    if (score > bestScore) { bestScore = score; best = d; }
  }
  return best;
}

// --- Similarity Search API (Google Lens-like) ---

/** @returns {number[] | null} */
export function getEmbedding() {
  return lastEmbedding;
}

/**
 * @param {number[]} embedding
 * @param {string} label
 */
export function addToGallery(embedding, label) {
  gallery.push(embedding);
  galleryLabels.push(label);
}

/**
 * @param {number[]} queryEmbedding
 * @param {number} [topK]
 */
export function searchGallery(queryEmbedding, topK = 5) {
  if (gallery.length === 0) return [];
  const scores = gallery.map((emb, i) => {
    let sim = 0;
    for (let j = 0; j < queryEmbedding.length; j++) sim += queryEmbedding[j] * emb[j];
    return { index: i, score: sim, label: galleryLabels[i] };
  });
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, topK);
}

/** @returns {number} */
export function getGallerySize() {
  return gallery.length;
}
