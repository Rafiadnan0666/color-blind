import { writable, derived } from 'svelte/store';

export const rawSettings = writable(null);
export const rawProfile = writable(null);

export const voiceEnabled = derived(rawSettings, $s => $s?.voiceassistantenabled ?? true);
export const voicePref = derived(rawSettings, $s => $s?.preferredvoice ?? '');
export const notifEnabled = derived(rawSettings, $s => $s?.notifications_enabled ?? true);
export const perfMode = derived(rawSettings, $s => $s?.performancemode ?? 'balanced');
export const theme = derived(rawSettings, $s => $s?.preferredtheme ?? 'system');
export const highContrast = derived(rawProfile, $p => $p?.highcontrastmode ?? false);
export const cvdMode = derived(rawProfile, $p => $p?.colorblindmode ?? 'none');
export const objectDetectionEnabled = derived(rawSettings, $s => $s?.objectdetectionenabled ?? true);
export const colorDetectionEnabled = derived(rawSettings, $s => $s?.colordetectionenabled ?? true);
export const ocrEnabled = derived(rawSettings, $s => $s?.ocrenabled ?? true);
export const realtimeDetection = derived(rawSettings, $s => $s?.realtimedetection ?? true);
export const avatarUrl = derived(rawProfile, $p => $p?.avatarurl ?? '');
export const profileName = derived(rawProfile, $p => $p?.name ?? '');
