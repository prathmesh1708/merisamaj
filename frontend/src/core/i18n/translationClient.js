/**
 * Translation client: batches on-screen texts, asks the backend once per distinct
 * text (POST /i18n/translate), and caches results in memory + localStorage so a text
 * is never requested twice. On failure the callback is not called and English stays.
 */
import { getApiUrl } from '../api/axiosConfig';

const STORAGE_KEY = 'apnisamaj_i18n_hi_v1';
const STORAGE_MAX_ENTRIES = 6000;
const STORAGE_MAX_TEXT = 300;          // long texts stay in memory only
const BATCH_ITEMS = 80;
const BATCH_CHARS = 12000;
const MAX_IN_FLIGHT = 2;
const RETRY_AFTER_MS = 60 * 1000;
const DEBOUNCE_MS = 60;

export const normalizeText = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^(https?:\/\/|www\.)\S+$/i;
const CODE_RE = /^[A-Z0-9][A-Z0-9_-]{4,}$/;
const LATIN_WORD_RE = /[A-Za-z]{2,}/;

/** Same rules as the backend: skip numbers, money, dates, emails, phones, URLs, IDs, Hindi */
export const isTranslatable = (core) => {
  if (!core || core.length < 2 || core.length > 1500) return false;
  if (!LATIN_WORD_RE.test(core)) return false;
  if (EMAIL_RE.test(core) || URL_RE.test(core) || CODE_RE.test(core)) return false;
  const deva = (core.match(/[ऀ-ॿ]/g) || []).length;
  const latin = (core.match(/[A-Za-z]/g) || []).length;
  return deva <= latin;
};

const cache = new Map();       // core → translated text
const waiting = new Map();     // core → Set<callback>
const queue = [];
const failedAt = new Map();
let inFlight = 0;
let timer = null;
let saveTimer = null;
let loaded = false;

const loadStored = () => {
  if (loaded) return;
  loaded = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const obj = JSON.parse(raw);
    Object.entries(obj || {}).forEach(([k, v]) => { if (typeof v === 'string') cache.set(k, v); });
  } catch { /* private mode / corrupted — start empty */ }
};

const saveStored = () => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const entries = [...cache].filter(([k]) => k.length <= STORAGE_MAX_TEXT);
      const keep = entries.slice(-STORAGE_MAX_ENTRIES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(keep)));
    } catch { /* storage full or blocked — memory cache still works */ }
  }, 1500);
};

const send = async (batch) => {
  inFlight++;
  try {
    const res = await fetch(`${getApiUrl()}/i18n/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lang: 'hi', texts: batch })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const list = json?.data?.translations || [];
    let added = false;
    batch.forEach((core, i) => {
      const t = typeof list[i] === 'string' ? list[i] : null;
      const cbs = waiting.get(core);
      waiting.delete(core);
      if (t) {
        cache.set(core, t);
        added = true;
        cbs?.forEach(cb => { try { cb(t); } catch { /* node gone */ } });
      } else {
        failedAt.set(core, Date.now()); // English stays; may retry later
      }
    });
    if (added) saveStored();
  } catch {
    batch.forEach(core => { waiting.delete(core); failedAt.set(core, Date.now()); });
  } finally {
    inFlight--;
    if (queue.length) schedule();
  }
};

const pump = () => {
  timer = null;
  while (queue.length && inFlight < MAX_IN_FLIGHT) {
    const batch = [];
    let chars = 0;
    while (queue.length && batch.length < BATCH_ITEMS && chars + queue[0].length <= BATCH_CHARS) {
      const core = queue.shift();
      batch.push(core);
      chars += core.length;
    }
    if (!batch.length) batch.push(queue.shift()); // a single very long text
    send(batch);
  }
};

const schedule = () => {
  if (!timer) timer = setTimeout(pump, DEBOUNCE_MS);
};

/**
 * Hindi for `core`. Calls `cb(text)` right away when cached, otherwise once the
 * backend answers. Returns the cached text (or undefined).
 */
export const requestTranslation = (core, cb) => {
  loadStored();
  const hit = cache.get(core);
  if (hit !== undefined) { cb?.(hit); return hit; }
  const failed = failedAt.get(core);
  if (failed && Date.now() - failed < RETRY_AFTER_MS) return undefined;
  if (waiting.has(core)) { if (cb) waiting.get(core).add(cb); return undefined; }
  waiting.set(core, new Set(cb ? [cb] : []));
  queue.push(core);
  schedule();
  return undefined;
};

/** Cached Hindi or undefined (no network) — used where an answer is needed right now */
export const cachedTranslation = (core) => { loadStored(); return cache.get(core); };
