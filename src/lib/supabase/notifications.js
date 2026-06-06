import { notifications } from './db';
import { getSupabaseBrowserClient } from './client';

export async function createNotification(title, message, type = 'info') {
  try {
    await notifications.create({ title, message, type });
  } catch (e) {
    console.warn('Failed to create notification:', e);
  }
}

export async function notifyScanComplete(objectCount, engineMode) {
  const titles = {
    fusion: 'Multi-Engine Scan Complete',
    coco: 'COCO Scan Complete',
    ssdlens: 'Object Detection Complete',
    currency: 'Currency Scan Complete',
    drug: 'Drug Detection Complete',
    traffic_light: 'Traffic Light Scan Complete',
    accessibility: 'Accessibility Scan Complete',
  };
  await createNotification(
    titles[engineMode] || 'Scan Complete',
    `Found ${objectCount} object${objectCount !== 1 ? 's' : ''} in your scan.`,
    'scan_complete'
  );
}

export async function notifyColorSaved(colorName, hex) {
  await createNotification(
    'Color Saved',
    `"${colorName}" (${hex}) added to your saved colors.`,
    'color_saved'
  );
}

export async function notifyFavoriteSaved(label) {
  await createNotification(
    'Favorite Added',
    `"${label}" saved to your favorites.`,
    'favorite_reminder'
  );
}

export async function sendEmailNotification(to, subject, body) {
  try {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.functions.invoke('send-notification-email', {
      body: { to, subject, body },
    });
    if (error) throw error;
  } catch (e) {
    console.warn('Failed to send email notification:', e);
  }
}
