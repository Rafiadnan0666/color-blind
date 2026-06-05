import { browser } from '$app/environment';

let _enabled = true;
let _voiceName = '';

export function setVoicePref(enabled, name) {
  _enabled = enabled;
  _voiceName = name || '';
}

export function speak(text) {
  if (!browser || !_enabled || !text) return;
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 0.9;
  u.pitch = 1;
  if (_voiceName) {
    const voices = window.speechSynthesis.getVoices();
    const found = voices.find(v => v.name.includes(_voiceName));
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
