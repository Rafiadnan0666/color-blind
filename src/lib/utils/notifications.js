import { notifications } from '$lib/supabase/db';
import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { notifEnabled } from '$lib/stores/settings';

export async function notify(title, message, type = 'general') {
  if (!browser) return;
  try {
    if (get(notifEnabled) && 'Notification' in window && Notification.permission === 'granted') {
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
