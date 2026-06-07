import { getSupabaseBrowserClient } from './client';

function supabase() {
  return getSupabaseBrowserClient();
}

let _userId = null;
let _lastOps = new Map();

export function setUserId(id) {
  _userId = id;
}

async function uid() {
  if (_userId) return _userId;
  const { data: { user } } = await supabase().auth.getUser();
  if (user) { _userId = user.id; return user.id; }
  return null;
}

function sanitize(str, maxLen = 500) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '').slice(0, maxLen);
}

function numeric(v, defaultVal = 0) {
  const n = Number(v);
  return isNaN(n) ? defaultVal : Math.min(Math.max(n, 0), 1);
}

const RATE_WINDOW = 2000;
const RATE_MAX = 10;

function checkRateLimit(key) {
  const now = Date.now();
  const entry = _lastOps.get(key);
  if (entry) {
    if (now - entry.ts < RATE_WINDOW && entry.count >= RATE_MAX) {
      throw new Error('rate_limit');
    }
    if (now - entry.ts >= RATE_WINDOW) {
      _lastOps.set(key, { ts: now, count: 1 });
    } else {
      entry.count++;
    }
  } else {
    _lastOps.set(key, { ts: now, count: 1 });
  }
}

export const scanHistory = {
  async create({ mode, objectName, objectColor, confidence }) {
    checkRateLimit('scan_create');
    const userid = await uid();
    if (!userid) throw new Error('auth_required');
    const { error } = await supabase().from('ScanHistory').insert([{
      userid, mode: sanitize(mode, 50), objectname: sanitize(objectName, 200),
      objectcolor: sanitize(objectColor, 20), confidence: numeric(confidence),
    }]);
    if (error) throw error;
  },
  async list(limit = 50, offset = 0) {
    const userid = await uid();
    if (!userid) return [];
    const { data, error } = await supabase().from('ScanHistory').select('*').eq('userid', userid).order('createdat', { ascending: false }).range(offset, offset + limit - 1);
    if (error) throw error;
    return data;
  },
  async count() {
    const userid = await uid();
    if (!userid) return 0;
    const { count, error } = await supabase().from('ScanHistory').select('*', { count: 'exact', head: true }).eq('userid', userid);
    if (error) throw error;
    return count ?? 0;
  },
  async delete(id) {
    const userid = await uid();
    if (!userid) return;
    const { error } = await supabase().from('ScanHistory').delete().eq('id', id).eq('userid', userid);
    if (error) throw error;
  },
};

export const favorites = {
  async create({ type: favType, value, notes = '' }) {
    checkRateLimit('fav_create');
    const userid = await uid();
    if (!userid) throw new Error('auth_required');
    const { error } = await supabase().from('Favorites').insert([{ userid, type: sanitize(favType, 100), value: sanitize(value, 50), notes: sanitize(notes, 500) }]);
    if (error) throw error;
  },
  async list(limit = 50, offset = 0) {
    const userid = await uid();
    if (!userid) return [];
    const { data, error } = await supabase().from('Favorites').select('*').eq('userid', userid).order('createdat', { ascending: false }).range(offset, offset + limit - 1);
    if (error) throw error;
    return data;
  },
  async count() {
    const userid = await uid();
    if (!userid) return 0;
    const { count, error } = await supabase().from('Favorites').select('*', { count: 'exact', head: true }).eq('userid', userid);
    if (error) throw error;
    return count ?? 0;
  },
  async delete(id) {
    const userid = await uid();
    if (!userid) return;
    const { error } = await supabase().from('Favorites').delete().eq('id', id).eq('userid', userid);
    if (error) throw error;
  },
};

export const savedColors = {
  async create({ colorName, hexCode, rgbValue }) {
    checkRateLimit('color_create');
    const userid = await uid();
    if (!userid) throw new Error('auth_required');
    const { error } = await supabase().from('SavedColors').insert([{ userid, colorname: sanitize(colorName, 100), hexcode: sanitize(hexCode, 20), rgbvalue: sanitize(rgbValue, 50) }]);
    if (error) throw error;
  },
  async list(limit = 50, offset = 0) {
    const userid = await uid();
    if (!userid) return [];
    const { data, error } = await supabase().from('SavedColors').select('*').eq('userid', userid).order('createdat', { ascending: false }).range(offset, offset + limit - 1);
    if (error) throw error;
    return data;
  },
  /**
   * @param {string} id
   * @param {{ colorName?: string, hexCode?: string, rgbValue?: string }} opts
   */
  async update(id, { colorName, hexCode, rgbValue }) {
    const userid = await uid();
    if (!userid) return;
    const updates = {};
    if (colorName !== undefined) updates.colorname = sanitize(colorName, 100);
    if (hexCode !== undefined) updates.hexcode = sanitize(hexCode, 20);
    if (rgbValue !== undefined) updates.rgbvalue = sanitize(rgbValue, 50);
    const { error } = await supabase().from('SavedColors').update(updates).eq('id', id).eq('userid', userid);
    if (error) throw error;
  },
  async delete(id) {
    const userid = await uid();
    if (!userid) return;
    const { error } = await supabase().from('SavedColors').delete().eq('id', id).eq('userid', userid);
    if (error) throw error;
  },
};

export const savedObjects = {
  async create({ objectName, notes = '' }) {
    checkRateLimit('obj_create');
    const userid = await uid();
    if (!userid) throw new Error('auth_required');
    const { error } = await supabase().from('SavedObjects').insert([{ userid, objectname: sanitize(objectName, 200), notes: sanitize(notes, 500) }]);
    if (error) throw error;
  },
  async list(limit = 50, offset = 0) {
    const userid = await uid();
    if (!userid) return [];
    const { data, error } = await supabase().from('SavedObjects').select('*').eq('userid', userid).order('createdat', { ascending: false }).range(offset, offset + limit - 1);
    if (error) throw error;
    return data;
  },
  async update(id, { objectName, notes }) {
    const userid = await uid();
    if (!userid) return;
    const updates = {};
    if (objectName !== undefined) updates.objectname = sanitize(objectName, 200);
    if (notes !== undefined) updates.notes = sanitize(notes, 500);
    const { error } = await supabase().from('SavedObjects').update(updates).eq('id', id).eq('userid', userid);
    if (error) throw error;
  },
  async delete(id) {
    const userid = await uid();
    if (!userid) return;
    const { error } = await supabase().from('SavedObjects').delete().eq('id', id).eq('userid', userid);
    if (error) throw error;
  },
};

export const objectAnalytics = {
  async increment(objectName, avgConfidence = 0) {
    const userid = await uid();
    if (!userid) return;
    const { error } = await supabase().rpc('increment_object_analytics', {
      p_objectname: sanitize(objectName, 200),
      p_confidence: numeric(avgConfidence),
      p_user_id: userid,
    });
    if (error) {
      const { data: existing } = await supabase()
        .from('ObjectAnalytics')
        .select('id, totaldetections, averageconfidence')
        .eq('objectname', sanitize(objectName, 200))
        .eq('userid', userid)
        .maybeSingle();
      if (existing) {
        const newAvg = ((existing.averageconfidence * existing.totaldetections) + avgConfidence) / (existing.totaldetections + 1);
        await supabase().from('ObjectAnalytics').update({ totaldetections: existing.totaldetections + 1, averageconfidence: newAvg, lastseen: new Date().toISOString() }).eq('id', existing.id).eq('userid', userid);
      } else {
        await supabase().from('ObjectAnalytics').insert([{ userid, objectname: sanitize(objectName, 200), totaldetections: 1, averageconfidence: numeric(avgConfidence), lastseen: new Date().toISOString() }]);
      }
    }
  },
  async getStats(limit = 50) {
    const userid = await uid();
    if (!userid) return [];
    const { data, error } = await supabase().from('ObjectAnalytics').select('*').eq('userid', userid).order('totaldetections', { ascending: false }).limit(limit);
    if (error) throw error;
    return data;
  },
};

export const notifications = {
  async create({ title, message, type = 'info' }) {
    checkRateLimit('notif_create');
    const userid = await uid();
    if (!userid) throw new Error('auth_required');
    const { error } = await supabase().from('Notifications').insert([{ userid, title: sanitize(title, 200), message: sanitize(message, 500), type: sanitize(type, 50), isread: false }]);
    if (error) throw error;
  },
  async list(limit = 50) {
    const userid = await uid();
    if (!userid) return [];
    const { data, error } = await supabase().from('Notifications').select('*').eq('userid', userid).order('createdat', { ascending: false }).limit(limit);
    if (error) throw error;
    return data;
  },
  async markRead(id) {
    const userid = await uid();
    if (!userid) return;
    const { error } = await supabase().from('Notifications').update({ isread: true }).eq('id', id).eq('userid', userid);
    if (error) throw error;
  },
  async markAllRead() {
    const userid = await uid();
    if (!userid) return;
    const { error } = await supabase().from('Notifications').update({ isread: true }).eq('isread', false).eq('userid', userid);
    if (error) throw error;
  },
  async getUnreadCount() {
    const userid = await uid();
    if (!userid) return 0;
    const { count, error } = await supabase().from('Notifications').select('*', { count: 'exact', head: true }).eq('isread', false).eq('userid', userid);
    if (error) throw error;
    return count ?? 0;
  },
};

export const feedback = {
  async create({ rating, feedback: msg }) {
    checkRateLimit('feedback_create');
    const userid = await uid();
    if (!userid) throw new Error('auth_required');
    const { error } = await supabase().from('Feedback').insert([{ userid, rating: Math.min(Math.max(Math.round(Number(rating)), 1), 5), feedback: sanitize(msg, 2000) }]);
    if (error) throw error;
  },
};

export const ocrHistory = {
  async create({ extractedText, language = null }) {
    checkRateLimit('ocr_create');
    const userid = await uid();
    if (!userid) throw new Error('auth_required');
    const { error } = await supabase().from('OCRHistory').insert([{ userid, extractedtext: sanitize(extractedText, 5000), language: sanitize(language, 20) || null }]);
    if (error) throw error;
  },
  async list(limit = 50, offset = 0) {
    const userid = await uid();
    if (!userid) return [];
    const { data, error } = await supabase().from('OCRHistory').select('*').eq('userid', userid).order('createdat', { ascending: false }).range(offset, offset + limit - 1);
    if (error) throw error;
    return data;
  },
  async delete(id) {
    const userid = await uid();
    if (!userid) return;
    const { error } = await supabase().from('OCRHistory').delete().eq('id', id).eq('userid', userid);
    if (error) throw error;
  },
};

export const assistantHistory = {
  async create({ question, answer }) {
    checkRateLimit('assistant_create');
    const userid = await uid();
    if (!userid) throw new Error('auth_required');
    const { error } = await supabase().from('AssistantHistory').insert([{ userid, question: sanitize(question, 2000), answer: sanitize(answer, 10000) }]);
    if (error) throw error;
  },
  async list() {
    const userid = await uid();
    if (!userid) return [];
    const { data, error } = await supabase().from('AssistantHistory').select('*').eq('userid', userid).order('createdat', { ascending: true });
    if (error) throw error;
    return data;
  },
  async clear() {
    const userid = await uid();
    if (!userid) return;
    const { error } = await supabase().from('AssistantHistory').delete().eq('userid', userid);
    if (error) throw error;
  },
};

export const userSettings = {
  async get() {
    const userid = await uid();
    if (!userid) return null;
    const { data, error } = await supabase().from('UserSettings').select('*').eq('userid', userid).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
  async upsert(settings) {
    const userid = await uid();
    if (!userid) throw new Error('auth_required');
    const { data: existing } = await supabase().from('UserSettings').select('id').eq('userid', userid).maybeSingle();
    const payload = existing ? { ...settings, userid, id: existing.id } : { ...settings, userid };
    const { error } = await supabase().from('UserSettings').upsert([payload], { onConflict: 'userid' });
    if (error) throw error;
  },
};

export const userProfile = {
  async get() {
    const userid = await uid();
    if (!userid) return null;
    const { data, error } = await supabase().from('UserProfile').select('*').eq('id', userid).single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },
  async upsert(profile) {
    const userid = await uid();
    if (!userid) throw new Error('auth_required');
    const { error } = await supabase().from('UserProfile').upsert([{ ...profile, id: userid }]);
    if (error) throw error;
  },
};
