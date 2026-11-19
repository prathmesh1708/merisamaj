/**
 * Encryption at rest for Aadhaar KYC data (DOB, gender, address, photo).
 *
 * AES-256-GCM with a dedicated key from AADHAAR_DATA_KEY (32 bytes, given as
 * 64 hex characters or base64). The key is separate from the JWT secret so the
 * two can be rotated independently. Losing the key makes stored KYC details
 * unreadable (verification status and the verified name are not encrypted and
 * are unaffected).
 *
 * Stored format: "v1:<iv b64>:<auth tag b64>:<ciphertext b64>"
 *
 * Generate a key:  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const VERSION = 'v1';

let cachedKey;

const loadKey = () => {
  if (cachedKey !== undefined) return cachedKey;
  const raw = String(process.env.AADHAAR_DATA_KEY || '').trim();
  let key = null;
  if (/^[0-9a-f]{64}$/i.test(raw)) key = Buffer.from(raw, 'hex');
  else if (raw) {
    const decoded = Buffer.from(raw, 'base64');
    if (decoded.length === 32) key = decoded;
  }
  if (raw && !key) console.error('[AadhaarCrypto] AADHAAR_DATA_KEY must be 32 bytes (64 hex chars or base64). Encrypted KYC storage is disabled.');
  cachedKey = key;
  return key;
};

/** True when a valid key is configured, i.e. KYC details can be stored. */
const isConfigured = () => !!loadKey();

const encrypt = (plain) => {
  const key = loadKey();
  if (!key) throw new Error('AADHAAR_DATA_KEY is not configured');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const input = Buffer.isBuffer(plain) ? plain : Buffer.from(String(plain), 'utf8');
  const ciphertext = Buffer.concat([cipher.update(input), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join(':');
};

/** Decrypts to a Buffer. Throws if the key is missing or the data was tampered with. */
const decryptToBuffer = (payload) => {
  const key = loadKey();
  if (!key) throw new Error('AADHAAR_DATA_KEY is not configured');
  const [version, iv, tag, data] = String(payload || '').split(':');
  if (version !== VERSION || !iv || !tag || !data) throw new Error('Unsupported encrypted payload');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64')), decipher.final()]);
};

const encryptJson = (value) => encrypt(JSON.stringify(value));
const decryptJson = (payload) => JSON.parse(decryptToBuffer(payload).toString('utf8'));

// Tests swap keys between cases.
const resetKeyCache = () => { cachedKey = undefined; };

module.exports = { isConfigured, encrypt, decryptToBuffer, encryptJson, decryptJson, resetKeyCache };
