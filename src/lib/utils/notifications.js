import { notifications } from '$lib/supabase/db';
import { browser } from '$app/environment';

let _enabled = true;

export function setNotifPref(enabled) {
  _enabled = enabled;
}

export async function notify(title, message, type = 'general') {
  if (!browser) return;
  try {
    if (_enabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: message, icon: '/favicon.png' });
    }
  } catch (_) {}
  try {
    await notifications.create({ title, message, type });
  } catch (_) {}
}

export function requestNotifPermission() {
  if (!browser || !('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
}
