import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-cpu';

const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair',
  'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse',
  'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink', 'refrigerator',
  'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier', 'toothbrush',
];

let model = null;
let loadAttempted = false;

async function initBackend() {
  // Try WebGL first via dynamic import so it doesn't crash at module load time
  try {
    await import('@tensorflow/tfjs-backend-webgl');
    await tf.setBackend('webgl');
    await tf.ready();
    console.log('[TF] Backend: webgl');
    return;
  } catch (e) {
    console.warn('[TF] WebGL failed, falling back to CPU:', e?.message);
  }
  // CPU fallback
  try {
    await tf.setBackend('cpu');
    await tf.ready();
    console.log('[TF] Backend: cpu');
  } catch (e) {
    console.error('[TF] CPU backend also failed:', e?.message);
  }
}

export async function loadTFModel() {
  if (model) return model;
  if (loadAttempted) return model ?? null;
  loadAttempted = true;
  try {
    await initBackend();
    const cocoSsd = await import('@tensorflow-models/coco-ssd');
    // @ts-ignore
    model = await cocoSsd.load({ scoreThreshold: 0.25, maxNumBoxes: 30 }).catch(() => null);
    // @ts-ignore
    if (!model) model = await cocoSsd.load({ scoreThreshold: 0.2, maxNumBoxes: 40 }).catch(() => null);
    if (!model) model = await cocoSsd.load({}).catch(() => null);
    console.log('[TF] COCO-SSD loaded:', !!model);
    return model;
  } catch (e) {
    console.error('[TF_MODEL_ERROR]', e?.message || e);
    return null;
  }
}

export async function detectTF(source) {
  if (!model) {
    await loadTFModel();
    if (!model) return [];
  }
  try {
    const predictions = await model.detect(source, 40);
    if (!predictions || !Array.isArray(predictions)) return [];
    return predictions.map((p) => ({
      x1: p.bbox[0], y1: p.bbox[1],
      x2: p.bbox[0] + p.bbox[2], y2: p.bbox[1] + p.bbox[3],
      width: p.bbox[2], height: p.bbox[3],
      score: p.score,
      classId: COCO_CLASSES.indexOf(p.class),
      label: p.class,
      model: 'coco-ssd',
    }));
  } catch (e) {
    console.error('COCO-SSD detect error:', e);
    return [];
  }
}

const NEO_COLORS = [
  '#ffd700', '#ff3366', '#00e5ff', '#39ff14', '#ff6b35',
  '#ff0033', '#0a0a0a', '#888888', '#e0e0e0',
];

export function getTFColor(label) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = label.charCodeAt(i) + ((hash << 5) - hash);
  return NEO_COLORS[Math.abs(hash) % NEO_COLORS.length];
}

export { COCO_CLASSES };