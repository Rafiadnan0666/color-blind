import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

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
let tfBadModel = false;

export async function loadTFModel() {
  if (model) return model;
  if (loadAttempted) {
    if (model) return model;
    return null;
  }
  loadAttempted = true;
  try {
    await tf.ready();
    const cocoSsd = await import('@tensorflow-models/coco-ssd');
    const loadWithConfig = async (config) => {
      try {
        return await cocoSsd.load(config);
      } catch (e) {
        console.warn(`[TF_MODEL] COCO-SSD config (${JSON.stringify(config)}) failed:`, e?.message);
        return null;
      }
    };
    model = await loadWithConfig({ scoreThreshold: 0.25, maxNumBoxes: 30 });
    if (!model) model = await loadWithConfig({ scoreThreshold: 0.2, maxNumBoxes: 40 });
    if (!model) model = await loadWithConfig({});
    return model;
  } catch (e) {
    console.error('[TF_MODEL_ERROR]', e?.message || e);
    return null;
  }
}

export async function detectTF(source) {
  if (tfBadModel) return [];
  if (!model) {
    await loadTFModel();
    if (!model) return [];
  }
  if (!model) return [];
  try {
    const predictions = await model.detect(source, 40);
    if (!predictions || !Array.isArray(predictions)) {
      if (!tfBadModel) { tfBadModel = true; console.warn('[TF_MODEL] COCO-SSD returned invalid predictions, marking as bad'); }
      return [];
    }
    return predictions.map((p) => ({
      x1: p.bbox[0], y1: p.bbox[1], x2: p.bbox[0] + p.bbox[2], y2: p.bbox[1] + p.bbox[3],
      width: p.bbox[2], height: p.bbox[3], score: p.score, classId: COCO_CLASSES.indexOf(p.class),
      label: p.class, model: 'coco-ssd',
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

export function isTfBad() { return tfBadModel; }
export { COCO_CLASSES };
