/**
 * Page translator: shows the whole app in Hindi without touching components or data.
 *
 * While Hindi is on, it watches the page (MutationObserver) and replaces the *display*
 * of English text nodes and of placeholder / title / aria-label attributes with their
 * Hindi translation. The original English is remembered per node and put back when
 * the user switches to English. React keeps its own copy of the text, so state,
 * forms, API data and the database are never changed.
 *
 * Not translated: inputs' typed values, <textarea>, code, anything inside
 * [translate="no"] / .notranslate / [data-no-translate] (names, chat messages,
 * the language switcher itself), and text without English words (numbers, phone
 * numbers, emails, IDs, Hindi).
 *
 * Browser dialogs (alert / confirm / prompt) are translated from the cache; a
 * message seen for the first time shows in English and is fetched for next time.
 */
import { normalizeText, isTranslatable, requestTranslation, cachedTranslation } from './translationClient';

const SKIP_SELECTOR = 'script,style,noscript,textarea,code,pre,svg,[translate="no"],.notranslate,[data-no-translate],[contenteditable="true"],[contenteditable=""]';
const ATTRS = ['placeholder', 'title', 'aria-label'];
const BUTTON_INPUT_TYPES = new Set(['button', 'submit', 'reset']);

let active = false;
let observer = null;
const textRecords = new WeakMap();      // Text → { original, lead, trail, core, applied }
const trackedTexts = new Set();
const attrRecords = new WeakMap();      // Element → { [attr]: { original, core, applied } }
const trackedEls = new Set();
let pruneCounter = 0;
let nativeDialogs = null;

const splitSpace = (value) => {
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(value);
  return { lead: m[1], core: normalizeText(m[2]), trail: m[3] };
};

const isSkipped = (el) => !el || !!el.closest(SKIP_SELECTOR);

// ── Text nodes ───────────────────────────────────────────────────────────────
const applyText = (node, rec, hindi) => {
  if (!active || textRecords.get(node) !== rec || node.nodeValue !== rec.original) return;
  if (!hindi || hindi === rec.core) return;
  rec.applied = rec.lead + hindi + rec.trail;
  node.nodeValue = rec.applied;
};

const processText = (node, checkedParent = false) => {
  const value = node.nodeValue;
  const prev = textRecords.get(node);
  if (prev && prev.applied !== null && value === prev.applied) return; // our own change
  if (!checkedParent && isSkipped(node.parentElement)) return;
  const { lead, core, trail } = splitSpace(value || '');
  if (!isTranslatable(core)) {
    if (prev) { textRecords.delete(node); trackedTexts.delete(node); }
    return;
  }
  const rec = { original: value, lead, trail, core, applied: null };
  textRecords.set(node, rec);
  trackedTexts.add(node);
  requestTranslation(core, (hindi) => applyText(node, rec, hindi));
};

// ── Attributes (placeholder, title, aria-label, button values) ───────────────
const applyAttr = (el, name, rec, hindi) => {
  const recs = attrRecords.get(el);
  if (!active || !recs || recs[name] !== rec || el.getAttribute(name) !== rec.original) return;
  if (!hindi || hindi === rec.core) return;
  rec.applied = hindi;
  el.setAttribute(name, hindi);
};

const processAttr = (el, name) => {
  const value = el.getAttribute(name);
  let recs = attrRecords.get(el);
  const prev = recs?.[name];
  if (prev && prev.applied !== null && value === prev.applied) return;
  if (value == null) { if (prev) delete recs[name]; return; }
  const core = normalizeText(value);
  if (!isTranslatable(core)) { if (prev) delete recs[name]; return; }
  if (!recs) { recs = {}; attrRecords.set(el, recs); }
  const rec = { original: value, core, applied: null };
  recs[name] = rec;
  trackedEls.add(el);
  requestTranslation(core, (hindi) => applyAttr(el, name, rec, hindi));
};

const processAttrs = (el) => {
  for (const name of ATTRS) if (el.hasAttribute(name)) processAttr(el, name);
  if (el.tagName === 'INPUT' && BUTTON_INPUT_TYPES.has((el.getAttribute('type') || '').toLowerCase()) && el.hasAttribute('value')) {
    processAttr(el, 'value');
  }
};

// ── Tree walking ─────────────────────────────────────────────────────────────
const walk = (root) => {
  if (root.nodeType === Node.TEXT_NODE) { processText(root); return; }
  if (root.nodeType !== Node.ELEMENT_NODE || isSkipped(root)) return;
  processAttrs(root);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.nodeType === Node.ELEMENT_NODE && n.matches(SKIP_SELECTOR)
      ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT)
  });
  let n = walker.nextNode();
  while (n) {
    if (n.nodeType === Node.TEXT_NODE) processText(n, true);
    else processAttrs(n);
    n = walker.nextNode();
  }
};

const prune = () => {
  if (++pruneCounter % 50) return;
  for (const n of trackedTexts) if (!n.isConnected) trackedTexts.delete(n);
  for (const el of trackedEls) if (!el.isConnected) trackedEls.delete(el);
};

// Runs before the browser paints, so cached Hindi replaces English without a flash
const onMutations = (mutations) => {
  if (!active) return;
  for (const m of mutations) {
    if (m.type === 'childList') m.addedNodes.forEach(walk);
    else if (m.type === 'characterData') processText(m.target);
    else if (m.type === 'attributes' && m.target.nodeType === Node.ELEMENT_NODE && !isSkipped(m.target)) {
      // `value` only for button-type inputs — never form values (<option>, text inputs)
      if (m.attributeName === 'value' && !(m.target.tagName === 'INPUT' && BUTTON_INPUT_TYPES.has((m.target.getAttribute('type') || '').toLowerCase()))) continue;
      processAttr(m.target, m.attributeName);
    }
  }
  prune();
};

// ── Browser dialogs ──────────────────────────────────────────────────────────
const translateMessage = (msg) => {
  if (msg == null) return msg;
  return String(msg).split('\n').map(line => {
    const { lead, core, trail } = splitSpace(line);
    if (!isTranslatable(core)) return line;
    const hit = cachedTranslation(core);
    if (hit) return lead + hit + trail;
    requestTranslation(core); // ready next time
    return line;
  }).join('\n');
};

const patchDialogs = () => {
  if (nativeDialogs) return;
  nativeDialogs = { alert: window.alert, confirm: window.confirm, prompt: window.prompt };
  window.alert = (msg) => nativeDialogs.alert.call(window, translateMessage(msg));
  window.confirm = (msg) => nativeDialogs.confirm.call(window, translateMessage(msg));
  window.prompt = (msg, def) => nativeDialogs.prompt.call(window, translateMessage(msg), def);
};

const restoreDialogs = () => {
  if (!nativeDialogs) return;
  window.alert = nativeDialogs.alert;
  window.confirm = nativeDialogs.confirm;
  window.prompt = nativeDialogs.prompt;
  nativeDialogs = null;
};

// ── Public API ───────────────────────────────────────────────────────────────
export const startTranslating = () => {
  if (active || typeof document === 'undefined') return;
  active = true;
  walk(document.documentElement); // includes <title>
  observer = new MutationObserver(onMutations);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: [...ATTRS, 'value']
  });
  patchDialogs();
};

export const stopTranslating = () => {
  if (!active) return;
  active = false;
  observer?.disconnect();
  observer = null;
  restoreDialogs();
  for (const node of trackedTexts) {
    const rec = textRecords.get(node);
    if (rec && rec.applied !== null && node.isConnected && node.nodeValue === rec.applied) node.nodeValue = rec.original;
    textRecords.delete(node);
  }
  trackedTexts.clear();
  for (const el of trackedEls) {
    const recs = attrRecords.get(el) || {};
    for (const [name, rec] of Object.entries(recs)) {
      if (rec.applied !== null && el.isConnected && el.getAttribute(name) === rec.applied) el.setAttribute(name, rec.original);
    }
    attrRecords.delete(el);
  }
  trackedEls.clear();
};

/** Hindi for one string from the cache (for code that builds text outside the page) */
export const translateNow = translateMessage;
