import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { voiceEnabled, voicePref } from '$lib/stores/settings';

export function speak(text) {
  if (!browser || !get(voiceEnabled) || !text) return;
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.9;
  u.pitch = 1;
  const pref = get(voicePref);
  if (pref) {
    const voices = window.speechSynthesis.getVoices();
    const found = voices.find(v => v.name.includes(pref));
    if (found) u.voice = found;
  }
  window.speechSynthesis.speak(u);
}

export function speakColor(colorName, hex) {
  speak(`Color: ${colorName || 'unknown'}. Hex: ${hex || 'not available'}.`);
}

export function speakObject(objectName, confidence) {
  const pct = confidence != null ? `, ${Math.round(confidence * 100)} percent confidence` : '';
  speak(`Detected: ${objectName}${pct}.`);
}

const MEAT_DESC = {
  'Fresh': 'Fresh meat, safe to cook.',
  'Half-Fresh': 'Half fresh meat, cook soon.',
  'Spoiled': 'Warning: spoiled meat, do not eat!',
  'Fresh Meat': 'Fresh meat, safe to cook.',
  'Half-Fresh Meat': 'Half fresh meat, cook soon.',
  'Spoiled Meat': 'Warning: spoiled meat, do not eat!',
};

const MUSHROOM_DESC = {
  'Autumn Skullcap': 'Warning: Autumn Skullcap, deadly poisonous.',
  'Death Cap': 'Warning: Death Cap, extremely poisonous.',
  'Destroying Angels': 'Warning: Destroying Angels, highly toxic.',
  'False Morel': 'Warning: False Morel, poisonous.',
  'Poison Fire Coral': 'Warning: Poison Fire Coral, highly toxic.',
};

export function speakMeatResult(label, confidence) {
  const desc = MEAT_DESC[label] || '';
  speak(`${desc} ${Math.round(confidence * 100)} percent confidence.`);
}

export function speakMushroomResult(label, confidence) {
  const desc = MUSHROOM_DESC[label] || '';
  speak(`${desc} ${Math.round(confidence * 100)} percent confidence.`);
}
