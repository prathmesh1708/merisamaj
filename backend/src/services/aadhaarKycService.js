/**
 * Aadhaar OTP verification through QuickeKYC (https://quickekyc.com).
 *
 *   generate:  POST {base}/aadhaar-v2/generate-otp  { key, id_number }
 *              → UIDAI sends an OTP to the mobile linked with that Aadhaar
 *   submit:    POST {base}/aadhaar-v2/submit-otp    { key, request_id, otp }
 *              → verified Aadhaar holder details (name, dob, gender, ...)
 *
 * QuickeKYC answers HTTP 200 even for errors; the real result is in the JSON
 * envelope: { status: 'success' | 'error', status_code, message, data, request_id }.
 *
 * Modes (QUICKEKYC_MODE):
 *   live     → https://api.quickekyc.com     with QUICKEKYC_API_KEY (real, charged)
 *   sandbox  → https://sandbox.quickekyc.com with QUICKEKYC_SANDBOX_API_KEY
 *   mock     → no network; OTP is always 123456 (never allowed in production)
 * Without a mode, live is used when a live key exists, otherwise mock outside production.
 */
const crypto = require('crypto');
const config = require('../config/config');

const BASE_URLS = {
  live: 'https://api.quickekyc.com/api/v1',
  sandbox: 'https://sandbox.quickekyc.com/api/v1'
};
const REQUEST_TIMEOUT_MS = 30 * 1000;
const MOCK_OTP = '123456';

class AadhaarKycError extends Error {
  constructor(message, status = 400, { otpRejected = false } = {}) {
    super(message);
    this.status = status;
    this.otpRejected = otpRejected;
  }
}

const isProduction = () => process.env.NODE_ENV === 'production';

const resolveMode = () => {
  const requested = String(process.env.QUICKEKYC_MODE || '').trim().toLowerCase();
  if (requested === 'mock') return isProduction() ? null : 'mock';
  if (requested === 'sandbox') return process.env.QUICKEKYC_SANDBOX_API_KEY ? 'sandbox' : null;
  if (requested === 'live') return process.env.QUICKEKYC_API_KEY ? 'live' : null;
  if (process.env.QUICKEKYC_API_KEY) return 'live';
  return isProduction() ? null : 'mock';
};

const apiKeyFor = (mode) => (mode === 'sandbox'
  ? process.env.QUICKEKYC_SANDBOX_API_KEY
  : process.env.QUICKEKYC_API_KEY);

// ─── Aadhaar number checks ────────────────────────────────────────────────
// Aadhaar numbers are 12 digits, never start with 0 or 1, and end in a
// Verhoeff check digit — catching typos before we pay for an API call.
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 0, 6, 7, 8, 9, 5], [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7], [4, 0, 1, 2, 3, 9, 5, 6, 7, 8], [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2], [7, 6, 5, 9, 8, 2, 1, 0, 4, 3], [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
];
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 5, 7, 6, 2, 8, 3, 0, 9, 4], [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7], [9, 4, 5, 3, 1, 2, 6, 8, 7, 0], [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5], [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
];
const passesVerhoeff = (digits) => {
  let c = 0;
  digits.split('').reverse().forEach((ch, i) => { c = VERHOEFF_D[c][VERHOEFF_P[i % 8][Number(ch)]]; });
  return c === 0;
};

const normalizeAadhaar = (value) => String(value || '').replace(/\D/g, '');
const isValidAadhaar = (digits) => /^[2-9]\d{11}$/.test(digits) && passesVerhoeff(digits);

// Keyed hash so the same Aadhaar can be detected on two accounts without
// storing the number itself.
const hashAadhaar = (digits) => crypto
  .createHmac('sha256', config.jwtSecret)
  .update(`aadhaar:${digits}`)
  .digest('hex');

// ─── QuickeKYC calls ──────────────────────────────────────────────────────
const callQuickeKyc = async (mode, path, body) => {
  let response;
  try {
    response = await fetch(`${BASE_URLS[mode]}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ key: apiKeyFor(mode), ...body }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
  } catch (err) {
    console.error(`[AadhaarKYC] ${path} network error:`, err.message);
    throw new AadhaarKycError('Aadhaar service is not reachable right now. Please try again in a minute.', 502);
  }

  let json = null;
  try { json = await response.json(); } catch { /* non-JSON body handled below */ }
  if (!json) {
    console.error(`[AadhaarKYC] ${path} returned non-JSON (HTTP ${response.status})`);
    throw new AadhaarKycError('Aadhaar service returned an unexpected response. Please try again.', 502);
  }

  const code = Number(json.status_code || response.status);
  if (json.status === 'success' && code < 400) return json;

  // Never log the API key or the Aadhaar number — only the provider's outcome.
  console.warn(`[AadhaarKYC] ${path} failed: ${code} ${json.message || ''}`);
  if (code === 401 || code === 403) {
    throw new AadhaarKycError('Aadhaar verification is temporarily unavailable. Please contact support.', 503);
  }
  if (code === 402) {
    throw new AadhaarKycError('Aadhaar verification is temporarily unavailable. Please try again later.', 503);
  }
  if (code >= 500) {
    throw new AadhaarKycError('UIDAI / Aadhaar service is busy right now. Please try again in a few minutes.', 502);
  }
  throw new AadhaarKycError(json.message || 'Aadhaar verification failed. Please try again.', 400, { otpRejected: true });
};

const pickFirst = (...values) => values.find(v => v !== undefined && v !== null && String(v).trim() !== '');

/** Ask UIDAI to send an OTP to the Aadhaar-linked mobile. Returns { requestId, mode, devOtp? }. */
const generateOtp = async (aadhaarDigits) => {
  const mode = resolveMode();
  if (!mode) throw new AadhaarKycError('Aadhaar verification is not configured. Please contact support.', 503);

  if (mode === 'mock') {
    return { requestId: `mock_${crypto.randomUUID()}`, mode, devOtp: MOCK_OTP };
  }

  const json = await callQuickeKyc(mode, '/aadhaar-v2/generate-otp', { id_number: aadhaarDigits });
  const data = json.data || {};
  if (data.valid_aadhaar === false) throw new AadhaarKycError('This Aadhaar number is not valid.');
  if (data.otp_sent === false) {
    throw new AadhaarKycError('UIDAI could not send an OTP. Make sure a mobile number is linked to this Aadhaar.');
  }
  const requestId = pickFirst(json.request_id, data.request_id, data.client_id);
  if (!requestId) {
    console.error('[AadhaarKYC] generate-otp succeeded without a request_id');
    throw new AadhaarKycError('Aadhaar service returned an unexpected response. Please try again.', 502);
  }
  return { requestId: String(requestId), mode };
};

// UIDAI returns the address in parts ({ house, street, landmark, loc, vtc, po,
// subdist, dist, state, country } + zip); some providers send one string.
const ADDRESS_PARTS = ['house', 'street', 'landmark', 'loc', 'vtc', 'po', 'subdist', 'dist', 'state'];
const formatAddress = (data) => {
  const raw = pickFirst(data.full_address, data.address);
  if (typeof raw === 'string') return raw.trim();
  const parts = raw && typeof raw === 'object' ? ADDRESS_PARTS.map(k => raw[k]) : [];
  const zip = pickFirst(data.zip, raw?.pincode, raw?.zip);
  const seen = new Set();
  const list = [...parts, zip, raw?.country]
    .map(v => String(v || '').trim())
    .filter(v => v && !seen.has(v.toLowerCase()) && seen.add(v.toLowerCase()));
  return list.join(', ');
};

// e-Aadhaar photo: base64 JPEG, sometimes already a data URL.
const parsePhoto = (data) => {
  const raw = String(pickFirst(data.profile_image, data.photo, data.image) || '').trim();
  if (!raw) return null;
  const m = raw.match(/^data:(image\/[a-z+]+);base64,(.+)$/i);
  const base64 = (m ? m[2] : raw).replace(/\s/g, '');
  if (!/^[A-Za-z0-9+/]+=*$/.test(base64)) return null;
  return { base64, mimeType: m ? m[1].toLowerCase() : 'image/jpeg' };
};

/**
 * Check the OTP. Returns the verified holder's details:
 * { fullName, dob, gender, address, photo: {base64, mimeType} | null, referenceId, mode }.
 * Nothing here is logged; the caller encrypts what it stores.
 */
const submitOtp = async (requestId, otp, mode) => {
  if (mode === 'mock') {
    if (otp !== MOCK_OTP) throw new AadhaarKycError('Invalid OTP. Please try again.', 400, { otpRejected: true });
    return { fullName: 'Test Aadhaar Holder', dob: '1990-01-01', gender: 'M', address: 'Test Address, Indore, Madhya Pradesh, 452001', photo: null, referenceId: requestId, mode };
  }

  const json = await callQuickeKyc(mode, '/aadhaar-v2/submit-otp', { request_id: requestId, otp });
  const data = json.data || {};
  return {
    fullName: String(pickFirst(data.full_name, data.name) || '').trim(),
    dob: String(pickFirst(data.dob, data.date_of_birth) || '').trim(),
    gender: String(pickFirst(data.gender) || '').trim(),
    address: formatAddress(data),
    photo: parsePhoto(data),
    referenceId: String(pickFirst(data.reference_id, json.request_id, data.client_id, requestId) || ''),
    mode
  };
};

module.exports = {
  AadhaarKycError,
  normalizeAadhaar,
  isValidAadhaar,
  hashAadhaar,
  generateOtp,
  submitOtp,
  resolveMode,
  formatAddress,
  parsePhoto
};
