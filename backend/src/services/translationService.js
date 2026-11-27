/**
 * Display translation (English → Hindi) for the whole app.
 *
 * Order for each text: hand-written glossary → in-memory cache → MongoDB cache →
 * google-translate-api-x (batched). Results are cached so each distinct text is
 * translated once. On any failure the text is returned as null and the app keeps
 * showing the English original — translation never blocks or breaks a page.
 *
 * Never changes stored content: callers get translated copies for display only.
 */
const crypto = require('crypto');
const { glossaryLookup } = require('../config/hindiGlossary');

const SUPPORTED_LANGS = ['hi'];
const MAX_TEXT_LENGTH = 1500;
const MAX_BATCH_ITEMS = 100;
const MAX_BATCH_CHARS = 20000;
const GOOGLE_CHUNK_ITEMS = 40;
const GOOGLE_CHUNK_CHARS = 4500;
const MEMORY_LIMIT = 20000;
const BREAKER_MS = 60 * 1000; // pause after the translation service fails

const memory = new Map();          // `${lang}\n${text}` → translated
let breakerUntil = 0;

const normalize = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
const hashOf = (lang, text) => crypto.createHash('sha1').update(`${lang}\n${text}`).digest('hex');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^(https?:\/\/|www\.)\S+$/i;
const CODE_RE = /^[A-Z0-9][A-Z0-9_-]{4,}$/;              // SAMAJ-YYFU, IDs, receipt numbers
const DEVANAGARI_RE = /[ऀ-ॿ]/g;
const LATIN_WORD_RE = /[A-Za-z]{2,}/;

/**
 * Whether a text should be machine-translated. Skips numbers, dates, money, emails,
 * phone numbers, URLs, codes/IDs, and text that is already mostly Hindi.
 */
const isTranslatable = (raw) => {
  const text = normalize(raw);
  if (text.length < 2 || text.length > MAX_TEXT_LENGTH) return false;
  if (!LATIN_WORD_RE.test(text)) return false;              // no English word at all
  if (EMAIL_RE.test(text) || URL_RE.test(text) || CODE_RE.test(text)) return false;
  const deva = (text.match(DEVANAGARI_RE) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  if (deva > latin) return false;                            // already Hindi
  return true;
};

const remember = (lang, source, translated) => {
  const key = `${lang}\n${source}`;
  if (memory.has(key)) memory.delete(key);
  memory.set(key, translated);
  if (memory.size > MEMORY_LIMIT) memory.delete(memory.keys().next().value);
};

const chunk = (items) => {
  const out = [];
  let cur = [];
  let chars = 0;
  for (const t of items) {
    if (cur.length && (cur.length >= GOOGLE_CHUNK_ITEMS || chars + t.length > GOOGLE_CHUNK_CHARS)) {
      out.push(cur); cur = []; chars = 0;
    }
    cur.push(t); chars += t.length;
  }
  if (cur.length) out.push(cur);
  return out;
};

// Injected in tests; real calls use google-translate-api-x
let engine = async (texts, lang) => {
  const { translate } = require('google-translate-api-x');
  const res = await translate(texts, { from: 'en', to: lang, rejectOnPartialFail: false, autoCorrect: false });
  return (Array.isArray(res) ? res : [res]).map(r => (r && typeof r.text === 'string' ? r.text : null));
};
const setEngine = (fn) => { engine = fn; };

let cacheModel = () => require('../models/TranslationCache');
const setCacheModel = (fn) => { cacheModel = fn; };

const machineTranslate = async (texts, lang) => {
  const results = new Map();
  if (!texts.length || Date.now() < breakerUntil) return results;
  for (const group of chunk(texts)) {
    try {
      const out = await engine(group, lang);
      group.forEach((src, i) => {
        const t = normalize(out[i]);
        if (t) results.set(src, t);
      });
    } catch (err) {
      breakerUntil = Date.now() + BREAKER_MS;
      console.warn('[translation] service unavailable, showing English for now:', err.message);
      break;
    }
  }
  return results;
};

/**
 * Translate many texts at once.
 * @returns {Promise<Array<string|null>>} same order as input; null = keep the original
 */
const translateTexts = async (inputs, lang) => {
  if (!SUPPORTED_LANGS.includes(lang)) throw Object.assign(new Error('Unsupported language.'), { status: 400 });
  const texts = inputs.map(normalize);
  const out = new Array(texts.length).fill(null);
  const need = new Set();

  texts.forEach((t, i) => {
    if (!isTranslatable(t)) return;
    const g = glossaryLookup(t);
    if (g) { out[i] = g; return; }
    const m = memory.get(`${lang}\n${t}`);
    if (m) { out[i] = m; return; }
    need.add(t);
  });

  if (need.size) {
    const Model = cacheModel();
    const byHash = new Map([...need].map(t => [hashOf(lang, t), t]));
    let stored = [];
    try {
      stored = await Model.find({ hash: { $in: [...byHash.keys()] } }).select('hash text lastUsedAt').lean();
    } catch (err) {
      console.warn('[translation] cache read failed:', err.message);
    }
    const stale = [];
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const doc of stored) {
      const src = byHash.get(doc.hash);
      if (!src) continue;
      remember(lang, src, doc.text);
      need.delete(src);
      if (!doc.lastUsedAt || new Date(doc.lastUsedAt).getTime() < monthAgo) stale.push(doc.hash);
    }
    if (stale.length) Model.updateMany({ hash: { $in: stale } }, { $set: { lastUsedAt: new Date() } }).catch(() => {});

    const fresh = await machineTranslate([...need], lang);
    if (fresh.size) {
      for (const [src, t] of fresh) remember(lang, src, t);
      const ops = [...fresh].map(([src, t]) => ({
        updateOne: {
          filter: { hash: hashOf(lang, src) },
          update: { $setOnInsert: { hash: hashOf(lang, src), lang, source: src, text: t }, $set: { lastUsedAt: new Date() } },
          upsert: true
        }
      }));
      Model.bulkWrite(ops, { ordered: false }).catch(err => console.warn('[translation] cache write failed:', err.message));
    }

    texts.forEach((t, i) => {
      if (out[i] === null && isTranslatable(t)) out[i] = memory.get(`${lang}\n${t}`) || null;
    });
  }
  return out;
};

/** Validates a request body: { lang, texts: string[] } within size limits */
const validateBatch = (body) => {
  const lang = body?.lang;
  const texts = body?.texts;
  if (!SUPPORTED_LANGS.includes(lang)) return 'Unsupported language.';
  if (!Array.isArray(texts) || texts.length === 0) return 'texts must be a non-empty list.';
  if (texts.length > MAX_BATCH_ITEMS) return `At most ${MAX_BATCH_ITEMS} texts per request.`;
  if (texts.some(t => typeof t !== 'string')) return 'Every text must be a string.';
  if (texts.reduce((n, t) => n + t.length, 0) > MAX_BATCH_CHARS) return 'Request too large.';
  return null;
};

const _resetForTests = () => { memory.clear(); breakerUntil = 0; };

module.exports = {
  SUPPORTED_LANGS,
  isTranslatable,
  translateTexts,
  validateBatch,
  normalize,
  setEngine,
  setCacheModel,
  _resetForTests
};
