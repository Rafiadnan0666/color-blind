const MEAT_CLASSES = ['Fresh', 'Half-Fresh', 'Spoiled'];

const MEAT_INFO = {
  Fresh: {
    label: 'Fresh / Segar',
    safety: 'Aman dikonsumsi',
    advice: 'Daging segar, aman untuk dimasak dan dikonsumsi.',
    color: '#39ff14',
    severity: 'safe',
    icon: 'fa-check-circle',
  },
  'Half-Fresh': {
    label: 'Half-Fresh / Setengah Segar',
    safety: 'Segera olah',
    advice: 'Daging setengah segar, segera masak hari ini juga.',
    color: '#ffd700',
    severity: 'warning',
    icon: 'fa-exclamation-triangle',
  },
  Spoiled: {
    label: 'Spoiled / Busuk',
    safety: 'BERBAHAYA! Jangan dimakan',
    advice: 'Daging busuk! Jangan dikonsumsi. Segera buang.',
    color: '#ff0033',
    severity: 'danger',
    icon: 'fa-skull-crossbones',
  },
};

const MUSHROOM_CLASSES = [
  'Autumn Skullcap', 'Death Cap', 'Destroying Angels',
  'False Morel', 'Poison Fire Coral',
];

const MUSHROOM_INFO = {
  'Autumn Skullcap': {
    label: 'Autumn Skullcap',
    toxicity: 'Sangat Beracun — Mematikan',
    advice: 'Mengandung amatoxin yang merusak hati. Jangan sentuh atau makan!',
    color: '#8B4513',
    severity: 'deadly',
    icon: 'fa-skull-crossbones',
  },
  'Death Cap': {
    label: 'Death Cap',
    toxicity: 'Sangat Beracun — Mematikan',
    advice: 'Jamur paling beracun di dunia! 1 kapsul cukup untuk membunuh orang dewasa.',
    color: '#ff0033',
    severity: 'deadly',
    icon: 'fa-skull-crossbones',
  },
  'Destroying Angels': {
    label: 'Destroying Angels',
    toxicity: 'Sangat Beracun — Mematikan',
    advice: 'Mengandung amatoxin fatal. Gejala muncul 6-24 jam setelah konsumsi.',
    color: '#ffd700',
    severity: 'deadly',
    icon: 'fa-skull-crossbones',
  },
  'False Morel': {
    label: 'False Morel',
    toxicity: 'Beracun — Berbahaya',
    advice: 'Mengandung gyromitrin yang dapat menyebabkan keracunan serius.',
    color: '#ff6b35',
    severity: 'danger',
    icon: 'fa-exclamation-triangle',
  },
  'Poison Fire Coral': {
    label: 'Poison Fire Coral',
    toxicity: 'Sangat Beracun — Mematikan',
    advice: 'Mengandung toksin trichothecene yang dapat diserap melalui kulit.',
    color: '#ff3366',
    severity: 'deadly',
    icon: 'fa-skull-crossbones',
  },
};

export function analyzeMeat(label, score) {
  const base = MEAT_INFO[label];
  if (!base) {
    return {
      label: label || 'Unknown',
      safety: 'Tidak diketahui',
      advice: 'Tidak dapat mengidentifikasi daging.',
      color: '#888',
      severity: 'unknown',
      icon: 'fa-question-circle',
    };
  }
  return {
    ...base,
    confidence: score,
    confidenceLabel: `${(score * 100).toFixed(0)}%`,
  };
}

export function analyzeMushroom(label, score) {
  const base = MUSHROOM_INFO[label];
  if (!base) {
    return {
      label: label || 'Unknown Mushroom',
      toxicity: 'Tidak diketahui',
      advice: 'Jamur tidak dikenal. JANGAN dikonsumsi tanpa identifikasi ahli.',
      color: '#888',
      severity: 'unknown',
      icon: 'fa-question-circle',
    };
  }
  return {
    ...base,
    confidence: score,
    confidenceLabel: `${(score * 100).toFixed(0)}%`,
  };
}

export function getMeatSafetyColor(label) {
  const info = MEAT_INFO[label];
  return info ? info.color : '#888';
}

export function getMushroomToxicityColor(label) {
  const info = MUSHROOM_INFO[label];
  return info ? info.color : '#888';
}

export { MEAT_CLASSES, MUSHROOM_CLASSES, MEAT_INFO, MUSHROOM_INFO };
