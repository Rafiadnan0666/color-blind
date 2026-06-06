import * as tf from '@tensorflow/tfjs';
const SCENE_CLASSES = ['garden', 'orchard', 'indoor_kitchen', 'supermarket'];
const MODEL_PATH = '/model_scene/model.json';
const INPUT_SIZE = 224;
let model = null;
export async function loadSceneModel() {
  if (model) return model;
  try {
    model = await tf.loadGraphModel(MODEL_PATH);
    return model;
  } catch ( err) {
    console.warn('Scene classifier TFJS model not found:', err instanceof Error ? err.message : err);
    return null;
  }
}
export async function classifyScene(source) {
  if (!model) {
    await loadSceneModel();
  }
  if (model) {
    return classifyWithModel(source);
  }
  return heuristicClassify(source);
}
async function classifyWithModel(source) {
  let imgTensor;
  try {
    if (source instanceof HTMLVideoElement) {
      imgTensor = tf.browser.fromPixels(source);
    } else if (source instanceof HTMLCanvasElement) {
      imgTensor = tf.browser.fromPixels(source);
    } else if (source instanceof HTMLImageElement) {
      imgTensor = tf.browser.fromPixels(source);
    } else {
      return { scene: 'unknown', confidence: 0 };
    }
    const resized = tf.image.resizeBilinear(imgTensor, [INPUT_SIZE, INPUT_SIZE]);
    const batched = resized.div(255.0).expandDims(0);
    imgTensor.dispose();
    resized.dispose();
    if (!model) return { scene: 'unknown', confidence: 0 };
    const predictions = model.predict(batched);
    const scores = await predictions.data();
    const scoreArray = Array.from(scores);
    const maxIdx = scoreArray.indexOf(Math.max(...scoreArray));
    const confidence = scoreArray[maxIdx];
    batched.dispose();
    predictions.dispose();
    return {
      scene: SCENE_CLASSES[maxIdx] || 'unknown',
      confidence,
      allScores: Object.fromEntries(SCENE_CLASSES.map((c, i) => [c, scoreArray[i]])),
    };
  } catch (e) {
    if (imgTensor) try { imgTensor.dispose(); } catch (_) {}
    return { scene: 'unknown', confidence: 0 };
  }
}
function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max === min) {
    h = 0;
  } else {
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
    h *= 180;
  }
  return [h, s * 100, v * 100];
}
function heuristicClassify(source) {
  let canvas;
  if (source instanceof HTMLCanvasElement) {
    canvas = source;
  } else {
    return { scene: 'unknown', confidence: 0 };
  }
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  let totalGreen = 0;
  let totalBrown = 0;
  const pixelCount = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const [h, s, v] = rgbToHsv(r, g, b);
    if (h > 35 && h < 170 && s > 20 && v > 20) totalGreen++;
    if ((h > 10 && h < 40) && s > 20 && v > 20 && v < 80) totalBrown++;
  }
  const greenRatio = totalGreen / pixelCount;
  const brownRatio = totalBrown / pixelCount;
  let scene = 'indoor_kitchen';
  let confidence = 0.4;
  if (greenRatio > 0.3) {
    scene = 'garden';
    confidence = Math.min(0.5 + greenRatio, 0.9);
  } else if (greenRatio > 0.15 && brownRatio > 0.05) {
    scene = 'orchard';
    confidence = 0.6;
  } else if (brownRatio > 0.2) {
    scene = 'orchard';
    confidence = 0.5;
  } else if (greenRatio < 0.05 && brownRatio < 0.05) {
    scene = 'supermarket';
    confidence = 0.4;
  }
  return { scene, confidence };
}
export function getSceneDescription(scene) {
  const descriptions = {
    'garden': 'This appears to be a garden setting with plants, flowers, and greenery.',
    'orchard': 'This looks like an orchard or grove with fruit trees and agricultural plants.',
    'indoor_kitchen': 'This appears to be an indoor kitchen environment.',
    'supermarket': 'This looks like a supermarket or grocery store with produce displays.',
    'unknown': 'Unable to determine the scene type.',
  };
  return descriptions[ (scene)] || descriptions['unknown'];
}
export { SCENE_CLASSES };