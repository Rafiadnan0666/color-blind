import { loadYoloModel, detectYolo, getYoloColor } from './yoloDetection';

const MODELS = {
  accessibility: {
    path: '/models/accessibility_640.onnx',
    classes: ['crosswalk', 'speedlimit', 'stop', 'trafficlight'],
    colors: { stop: '#ff0033', trafficlight: '#ffcc00', crosswalk: '#00ccff', speedlimit: '#ff9900' },
    displayNames: { crosswalk: 'Crosswalk', speedlimit: 'Speed Limit', stop: 'Stop Sign', trafficlight: 'Traffic Light' },
    useYolo: true,
  },
  currency: {
    path: '/models/currency_detection_640.onnx',
    classes: ['rp1000', 'rp2000', 'rp5000', 'rp10000', 'rp20000', 'rp50000', 'rp100000'],
    colors: { rp1000: '#8B4513', rp2000: '#2E8B57', rp5000: '#4169E1', rp10000: '#8B008B', rp20000: '#006400', rp50000: '#B22222', rp100000: '#FF4500' },
    displayNames: { rp1000: 'Rp 1.000', rp2000: 'Rp 2.000', rp5000: 'Rp 5.000', rp10000: 'Rp 10.000', rp20000: 'Rp 20.000', rp50000: 'Rp 50.000', rp100000: 'Rp 100.000' },
    useYolo: true,
  },
  drug: {
    path: '/models/drug_detection_640.onnx',
    classes: ['paracetamol', 'panadol', 'amoxicillin', 'vitamin_c'],
    colors: { paracetamol: '#00ccff', panadol: '#ff6b35', amoxicillin: '#39ff14', vitamin_c: '#ffd700' },
    displayNames: { paracetamol: 'Paracetamol', panadol: 'Panadol', amoxicillin: 'Amoxicillin', vitamin_c: 'Vitamin C' },
    useYolo: true,
  },
  traffic_light: {
    path: '/models/traffic_light_640.onnx',
    classes: ['traffic_light_red', 'traffic_light_green', 'traffic_light_yellow'],
    colors: { traffic_light_red: '#ff0033', traffic_light_green: '#00cc44', traffic_light_yellow: '#ffcc00' },
    displayNames: { traffic_light_red: 'Red Light', traffic_light_green: 'Green Light', traffic_light_yellow: 'Yellow Light' },
    useYolo: true,
  },
  meat: {
    path: '/models/meat_freshness_classifier.onnx',
    classes: ['Fresh', 'Half-Fresh', 'Spoiled'],
    colors: { Fresh: '#39ff14', 'Half-Fresh': '#ffd700', Spoiled: '#ff0033' },
    displayNames: { Fresh: 'Fresh', 'Half-Fresh': 'Half-Fresh', Spoiled: 'Spoiled' },
    useYolo: true,
  },
  mushroom: {
    path: '/models/mushroom_classifier.onnx',
    classes: ['Autumn Skullcap', 'Death Cap', 'Destroying Angels', 'False Morel', 'Poison Fire Coral'],
    colors: { 'Autumn Skullcap': '#8B4513', 'Death Cap': '#ff0033', 'Destroying Angels': '#ffd700', 'False Morel': '#ff6b35', 'Poison Fire Coral': '#ff3366' },
    displayNames: { 'Autumn Skullcap': 'Autumn Skullcap', 'Death Cap': 'Death Cap', 'Destroying Angels': 'Destroying Angels', 'False Morel': 'False Morel', 'Poison Fire Coral': 'Poison Fire Coral' },
    useYolo: true,
  },
};

let sessions = {};
let loadAttempted = {};

export async function loadMobileNetModel(modelKey = 'currency') {
  if (loadAttempted[modelKey]) return;
  loadAttempted[modelKey] = true;
  const cfg = MODELS[modelKey];
  if (!cfg) return;
  try {
    await loadYoloModel(modelKey);
    sessions[modelKey] = { __yolo: true, modelKey };
  } catch (e2) {
    console.error(`[MODEL_LOAD_ERROR] ONNX failed for [${modelKey}]:`, e2?.message || e2);
  }
}

export async function loadAllMobileNetModels() {
  await Promise.allSettled(Object.keys(MODELS).map(k => loadMobileNetModel(k)));
}

export async function detectMobileNet(source, modelKey = 'currency') {
  const sess = sessions[modelKey];
  if (!sess) {
    console.warn(`Model[${modelKey}]: not loaded`);
    return [];
  }
  const results = await detectYolo(source, modelKey);
  return results.map(d => ({ ...d, model: 'mobilenet' }));
}

export function getMobileNetColor(label) {
  for (const cfg of Object.values(MODELS)) {
    if (cfg.colors[label]) return cfg.colors[label];
  }
  const rawLabel = Object.entries(
    Object.values(MODELS).reduce((acc, cfg) => ({ ...acc, ...cfg.displayNames }), {})
  ).find(([, v]) => v === label)?.[0];
  if (rawLabel) {
    for (const cfg of Object.values(MODELS)) {
      if (cfg.colors[rawLabel]) return cfg.colors[rawLabel];
    }
  }
  return getYoloColor(label);
}

export function getMobileNetModelKeys() {
  return Object.keys(MODELS);
}
