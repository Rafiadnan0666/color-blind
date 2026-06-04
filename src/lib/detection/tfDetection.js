// Primary model: MobileNetV2 (Kaggle/TFHub)
// https://www.kaggle.com/models/google/mobilenet-v2/tfJs
// Loaded via @tensorflow-models/mobilenet (same model, publicly hosted on TFHub)

let tf = null;
let modelInstance = null;
let loadAttempted = false;
let modelVersion = null;

const CONF_THRESHOLD = 0.05;
const NEO_COLORS = [
  '#ffd700', '#ff3366', '#00e5ff', '#39ff14', '#ff6b35',
  '#ff0033', '#0a0a0a', '#888888', '#e0e0e0',
];

export async function loadTFModel() {
  if (loadAttempted) return;
  loadAttempted = true;

  try {
    tf = await import('@tensorflow/tfjs');
    await tf.ready();
    await import('@tensorflow/tfjs-backend-webgl').catch(() => {});

    const mobilenet = await import('@tensorflow-models/mobilenet');
    modelInstance = await mobilenet.load({
      version: 2,
      alpha: 1.0,
    });
    modelVersion = 'mobilenetv2';
    return;
  } catch (e) {
    console.warn('MobileNetV2 (@tensorflow-models/mobilenet) failed:', e?.message || e);
  }

  try {
    if (!tf) tf = await import('@tensorflow/tfjs');
    await tf.ready();
    await import('@tensorflow/tfjs-backend-webgl').catch(() => {});
    const mobilenet = await import('@tensorflow-models/mobilenet');
    modelInstance = await mobilenet.load({
      version: 2,
      alpha: 1.0,
    });
    modelVersion = 'mobilenetv2';
  } catch (e) {
    console.warn('All model load paths failed:', e?.message || e);
  }
}

function getSourceDimensions(source) {
  if (source instanceof HTMLVideoElement) {
    return { width: source.videoWidth, height: source.videoHeight };
  }
  if (source instanceof HTMLCanvasElement) {
    return { width: source.width, height: source.height };
  }
  if (source instanceof HTMLImageElement) {
    return { width: source.naturalWidth, height: source.naturalHeight };
  }
  return { width: 640, height: 480 };
}

export async function detectTF(source) {
  if (!modelInstance) return [];
  const dims = getSourceDimensions(source);

  if (modelVersion === 'mobilenetv2') {
    try {
      const predictions = await modelInstance.classify(source);
      return predictions
        .filter(p => p.probability > CONF_THRESHOLD)
        .slice(0, 5)
        .map((p, i) => ({
          x1: 0,
          y1: (dims.height / 5) * i,
          x2: dims.width,
          y2: (dims.height / 5) * (i + 1),
          width: dims.width,
          height: dims.height / 5,
          score: p.probability,
          classId: i,
          label: p.className.split(',')[0].trim(),
          model: 'mobilenetv2',
        }));
    } catch (e) {
      console.warn('MobileNetV2 classify error:', e?.message || e);
      return [];
    }
  }

  return [];
}

export function getTFColor(label) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = label.charCodeAt(i) + ((hash << 5) - hash);
  return NEO_COLORS[Math.abs(hash) % NEO_COLORS.length];
}

export { };
