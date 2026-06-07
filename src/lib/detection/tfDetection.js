import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';

let model = null;
let loadAttempted = false;

async function initBackend() {
  // Try backends in order of preference
  const backends = ['webgl', 'cpu'];
  for (const backend of backends) {
    try {
      await tf.setBackend(backend);
      await tf.ready();
      console.log('[TF] Using backend:', tf.getBackend());
      return;
    } catch (e) {
      console.warn(`[TF] Backend "${backend}" failed:`, e?.message);
    }
  }
}

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

export async function loadTFModel() {
  if (model) return model;
  if (loadAttempted) return model ?? null;
  loadAttempted = true;
  try {
    await initBackend();
    const cocoSsd = await import('@tensorflow-models/coco-ssd');
    // @ts-ignore - scoreThreshold is valid at runtime but missing from types
    model = await cocoSsd.load({ scoreThreshold: 0.25, maxNumBoxes: 30 }).catch(() => null);
    if (!model) {
      // @ts-ignore
      model = await cocoSsd.load({ scoreThreshold: 0.2, maxNumBoxes: 40 }).catch(() => null);
    }
    if (!model) {
      model = await cocoSsd.load({}).catch(() => null);
    }
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
  if (!model) return [];
  try {
    const predictions = await model.detect(source, 40);
    if (!predictions || !Array.isArray(predictions)) return [];
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

export { COCO_CLASSES };
