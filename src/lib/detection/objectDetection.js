import { loadTFModel, detectTF, getTFColor } from './tfDetection';
import {
  loadMobileNetModel,
  loadAllMobileNetModels,
  detectMobileNet,
  getMobileNetColor,
  getMobileNetModelKeys
} from './mobilenetDetection';

const CLASS_NAMES = [
  'ripe_apple', 'unripe_apple', 'ripe_banana', 'unripe_banana',
  'ripe_orange', 'unripe_orange', 'ripe_strawberry', 'unripe_strawberry',
  'ripe_tomato', 'unripe_tomato', 'plant', 'other_object',
];

let gallery = [];
let galleryLabels = [];

function hashColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 65%, 50%)`;
}

let tfModelLoaded = false;
let mobilenetModelsLoaded = new Set();

export async function loadModel() {
  if (!tfModelLoaded) {
    tfModelLoaded = true;
    try {
      await loadTFModel();
    } catch (e) {
      console.error('[MODEL_LOAD_ERROR] MobileNetV2:', e?.message || e);
    }
  }
}

export async function loadMobileNetModelForMode(mode) {
  if (mobilenetModelsLoaded.has(mode)) return;
  mobilenetModelsLoaded.add(mode);
  await loadMobileNetModel(mode);
}

export { CLASS_NAMES as YOLO_CLASSES };

export async function detectObjects(source) {
  try {
    const results = await detectTF(source);
    return results;
  } catch (e) {
    console.error('detectObjects error:', e);
    return [];
  }
}

export function getColor(label) {
  return getTFColor(label) || hashColor(label);
}

export function pickNearestCenter(dets, cw, ch) {
  if (!dets || !dets.length) return null;
  const cx = cw / 2, cy = ch / 2;
  let best = null;
  let bestScore = 0;
  for (const d of dets) {
    const dcx = d.x1 + d.width / 2, dcy = d.y1 + d.height / 2;
    const dist = Math.sqrt((dcx - cx) ** 2 + (dcy - cy) ** 2);
    const score = d.score / (1 + dist / Math.max(cw, ch)) * Math.min((d.width * d.height) / (cw * ch * 0.5), 1);
    if (score > bestScore) { bestScore = score; best = d; }
  }
  if (!best && dets.length > 0) best = dets[0];
  return best;
}

export function getEmbedding() { return null; }

export function addToGallery(embedding, label) {
  gallery.push(embedding);
  galleryLabels.push(label);
}

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

export function getGallerySize() { return gallery.length; }
