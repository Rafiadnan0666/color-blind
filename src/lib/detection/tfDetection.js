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
let modelType = 'lite_mobilenet_v2';

export async function loadTFModel(type = 'lite_mobilenet_v2') {
  if (loadAttempted && model) return model;
  modelType = type;
  loadAttempted = true;
  try {
    await tf.ready();
    const cocoSsd = await import('@tensorflow-models/coco-ssd');
    model = await cocoSsd.load(/** @type {any} */({ base: 'lite_mobilenet_v2', scoreThreshold: 0.3 }));
    return model;
  } catch (e) {
    console.error('[MODEL_LOAD_ERROR] COCO-SSD:', e?.message || e);
    return null;
  }
}

export async function loadTFLocalModel(modelUrl = '/model_coco/model.json') {
  try {
    await tf.ready();
    const cocoSsd = await import('@tensorflow-models/coco-ssd');
    model = await cocoSsd.load(/** @type {any} */({ base: 'lite_mobilenet_v2', scoreThreshold: 0.3 }));
    loadAttempted = true;
    return model;
  } catch (e) {
    console.warn('Local COCO-SSD model not loaded from', modelUrl, e);
    return null;
  }
}

export async function detectTF(source) {
  if (!model) { console.warn('TF: model not loaded'); return []; }
  try {
    const predictions = await model.detect(source, 20);
    if (predictions.length > 0) {
      const topScore = Math.max(...predictions.map(p => p.score));
    }
    return predictions.map((p) => ({
      x1: p.bbox[0],
      y1: p.bbox[1],
      x2: p.bbox[0] + p.bbox[2],
      y2: p.bbox[1] + p.bbox[3],
      width: p.bbox[2],
      height: p.bbox[3],
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
