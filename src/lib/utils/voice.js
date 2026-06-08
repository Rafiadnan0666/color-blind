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

// MEAT/MUSHROOM voice functions — removed for production (COCO-SSD only)
